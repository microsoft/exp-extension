import * as tl from 'azure-pipelines-task-lib';
import * as path from 'path';
import * as fs from 'fs';
import * as querystring from 'querystring';
import { HttpClient } from "typed-rest-client/HttpClient";
import { IHeaders } from 'typed-rest-client/Interfaces';
import * as jwt from 'jsonwebtoken'

const CERTIFICATE_FILE_PATH = path.join(tl.getVariable('Agent.TempDirectory'), 'spnCert.pem');
const AUTHORITY_URL = 'https://login.windows.net';

export class ExpAuthorizer {
    constructor(serviceConnectionId: string, userAgent: string) {
        this._serviceConnectionId = serviceConnectionId;
        this._httpClient = new HttpClient(userAgent);
    }

    public async getAccessToken() {
        let servicePrincipalAuthenticationType = tl.getEndpointAuthorizationParameter(this._serviceConnectionId, 'authenticationType', true);
        if (!!servicePrincipalAuthenticationType && servicePrincipalAuthenticationType.toLowerCase() === 'spncertificate') {
            return this.getAccessTokenUsingServicePrincipalCertificate();
        }
        else {
            return this.getAccessTokenUsingServicePrincipalKey();
        }
    }

    public async getAccessTokenUsingServicePrincipalCertificate(): Promise<string> {
        tl.debug('Service principal secret type: Certificate');

        let servicePrincipalClientId = tl.getEndpointAuthorizationParameter(this._serviceConnectionId, 'serviceprincipalid', false);
        let servicePrincipalCertificate = tl.getEndpointAuthorizationParameter(this._serviceConnectionId, 'servicePrincipalCertificate', false);
        let tenantId = tl.getEndpointAuthorizationParameter(this._serviceConnectionId, 'tenantid', false);

        fs.writeFileSync(CERTIFICATE_FILE_PATH, servicePrincipalCertificate);

        let url = `${AUTHORITY_URL}/${tenantId}/oauth2/token`;
        let data = querystring.stringify({
            resource: 'https://exp.microsoft.com/',
            client_id: servicePrincipalClientId,
            grant_type: 'client_credentials',
            client_assertion: this._getSPNCertificateAuthorizationToken(servicePrincipalClientId, tenantId),
            client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'
        });

        let headers = {
			'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
        } as IHeaders;
        
        tl.debug('Fetching access token');
        tl.debug(`[POST] ${url}`);
        let response = await this._httpClient.post(url, data, headers);

        let responseBody = await response.readBody();
        if (response.message.statusCode === 200) {
            if (!!responseBody) {
                let accessToken = JSON.parse(responseBody)['access_token'];
                tl.setSecret(accessToken);
                return accessToken;
            }
            else {
                throw new Error(tl.loc('UnableToFetchAccessTokenNullResponse', response));
            }
        }
        else {
            throw new Error(tl.loc('UnableToFetchAccessToken', response.message.statusCode, responseBody));
        }
    }

    public async getAccessTokenUsingServicePrincipalKey(): Promise<string> {
        tl.debug('Service principal secret type: SecretKey');

        let servicePrincipalClientId = tl.getEndpointAuthorizationParameter(this._serviceConnectionId, 'serviceprincipalid', false);
        let servicePrincipalKey = tl.getEndpointAuthorizationParameter(this._serviceConnectionId, 'serviceprincipalkey', false);
        let tenantId = tl.getEndpointAuthorizationParameter(this._serviceConnectionId, 'tenantid', false);

        let url = `${AUTHORITY_URL}/${tenantId}/oauth2/token`;

        let data = querystring.stringify({
			resource: 'https://exp.microsoft.com',
			client_id: servicePrincipalClientId,
			grant_type: 'client_credentials',
			client_secret: servicePrincipalKey
		});

		let headers = {
			'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
		} as IHeaders;

        tl.debug('Fetching access token');
        tl.debug(`[POST] ${url}`);
        let response = await this._httpClient.post(url, data, headers);

        let responseBody = await response.readBody();
        if (response.message.statusCode === 200) {
            if (!!responseBody) {
                let accessToken = JSON.parse(responseBody)['access_token'];
                tl.setSecret(accessToken);
                return accessToken;
            }
            else {
                throw new Error(tl.loc('UnableToFetchAccessTokenNullResponse', response));
            }
        }
        else {
            throw new Error(tl.loc('UnableToFetchAccessToken', response.message.statusCode, responseBody));
        }
    }

    public static Clean() {
        // cleanup temp certificate files and credentials.
        if (tl.exist(CERTIFICATE_FILE_PATH)) {
            tl.rmRF(CERTIFICATE_FILE_PATH);
        }
    }

    private _getSPNCertificateAuthorizationToken(servicePrincipalClientId: string, tenantId: string): string {
        let openSSLPath =   tl.osType().match(/^Win/) ? tl.which(path.join(__dirname, 'openssl', 'openssl')) : tl.which('openssl');
        let openSSLArgsArray = [
            "x509",
            "-noout",
            "-in" ,
            CERTIFICATE_FILE_PATH,
            "-fingerprint"
        ];

        let pemExecutionResult = tl.execSync(openSSLPath, openSSLArgsArray);
        let additionalHeaders = {
            "alg": "RS256",
            "typ": "JWT",
        };

        if(pemExecutionResult.code == 0) {
            tl.debug("FINGERPRINT CREATION SUCCESSFUL");
            let shaFingerprint = pemExecutionResult.stdout;
            let shaFingerPrintHashCode = shaFingerprint.split("=")[1].replace(new RegExp(":", 'g'), "");
            let fingerPrintHashBase64: string = Buffer.from(
                shaFingerPrintHashCode.match(/\w{2}/g).map(function(a) { 
                    return String.fromCharCode(parseInt(a, 16));
                } ).join(""),
                'binary'
            ).toString('base64');
            additionalHeaders["x5t"] = fingerPrintHashBase64;
        }
        else {
            console.log(pemExecutionResult);
            throw new Error(pemExecutionResult.stderr);
        }

        return this._getJWT(AUTHORITY_URL, servicePrincipalClientId, tenantId, CERTIFICATE_FILE_PATH, additionalHeaders);
    }

    private _getJWT(url: string, clientId: string, tenantId: string, pemFilePath: string, additionalHeaders) {
        let pemFileContent = fs.readFileSync(pemFilePath);
        let jwtObject = {
            "aud": (`${url}/${tenantId}/oauth2/token`).replace(/([^:]\/)\/+/g, "$1"),
            "iss": clientId,
            "sub": clientId,
            "jti": "" + Math.random(),
            "nbf":  (Math.floor(Date.now()/1000)-1000),
            "exp": (Math.floor(Date.now()/1000)+8640000)
        };
    
        let token = jwt.sign(jwtObject, pemFileContent,{ algorithm: 'RS256', header :additionalHeaders });
        return token;
    }
    
    private _httpClient: HttpClient;
    private _serviceConnectionId: string;
}