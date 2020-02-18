# Manage Experiment

## Overview

The Manage Experiment task is used to manage experiments in the [Exp Control Tower](https://exp.microsoft.com). Currently this task supports starting an experiment, advancing an experiment, stopping an experiment and stopping all experiments in a progression.

To use this task as part of the overall Azure DevOps Feature Flag rollout pipeline, refer to the [Exp extension wiki](https://github.com/microsoft/exp-extension/wiki/Exp-Extension-Wiki).

## Contact Information

Please report a problem in the repo's [issues](https://github.com/microsoft/exp-extension/issues).

## Pre-requisites for the task

### Create an Exp Service Connection:
Create an Azure Active Directory Application from the Azure portal and delegate API permissions to Control Tower Website. Go to the Control Tower Website and add (if not already present) the Application Id as the owner of the Feature Rollout in which your experiments reside. 

Create an Exp Service Connection in Azure DevOps. Provide the Application Id and Application Client Secret in the Exp Service Connection panel. This service connection will be used to manage the experiments.

## Parameters of the Task

The task is used to manage experiments in the Exp Control Tower. The mandatory fields are highlighted with a *.

* **Exp Service Connection**\*: Select the Exp Service Connection from the dropdown. To add a new Service Connection click on **+ New**.

* **Feature Id**\*: Enter the Feature Id of the Feature Rollout in which your experiments reside.

* **Progression Id**\*: Enter the Progression Id of the Progression within the Feature Rollout in which your experiments reside.

* **Action**\*: Select the action you want to perform on the Experiment you want to manage. The currently supported actions are:
  * **Start experiment**: Start an experiment in the progression
  * **Advance experiment**: Advance an experiment in the progression
  * **Stop experiment**: Stop an experiment in the progression
  * **Stop all experiments**: Stop all experiments in the progression

* **Experiment Name**\*: Enter the Experiment name of the experiment you want to manage. This input is only available for Start experiment, Advance experiment and Stop experiment actions.
