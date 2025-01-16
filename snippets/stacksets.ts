import { DrataStackSet } from '@factbird/drata-cdk-stackset';
import { App, type CfnStackSet, Stack } from 'aws-cdk-lib';
import { AccountPrincipal, ManagedPolicy, Role } from 'aws-cdk-lib/aws-iam';
import { Capability, DeploymentType, StackSet, StackSetTarget, StackSetTemplate } from 'cdk-stacksets';

const organizationalUnits = {
  targetAccounts: 'ou-1234567',
};

const yourAccounts = {
  drata: '987654321',
  management: '1234567890',
};

const externalId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const app = new App();

const stack = new Stack(app, 'drata', {
  env: {
    account: yourAccounts.drata,
  },
});

// The Drata account itself needs to execute the StackSets as a self-managed
// variant
new Role(stack, 'StackSetExecutionRole', {
  roleName: 'AWSCloudFormationStackSetExecutionRole',
  managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')],
  assumedBy: new AccountPrincipal(yourAccounts.drata),
});

const drataStackSet = new DrataStackSet(stack, 'DrataStack');

const serviceManaged = new StackSet(stack, 'drata-service-managed', {
  target: StackSetTarget.fromOrganizationalUnits({
    regions: ['us-east-1'],
    organizationalUnits: Object.values(organizationalUnits),
    parameterOverrides: {
      externalId,
    },
  }),
  deploymentType: DeploymentType.serviceManaged(),
  template: StackSetTemplate.fromStackSetStack(drataStackSet),
  capabilities: [Capability.NAMED_IAM],
});

const selfManaged = new StackSet(stack, 'drata-self-managed', {
  target: StackSetTarget.fromAccounts({
    regions: ['us-east-1'],
    accounts: [yourAccounts.management, yourAccounts.drata],
    parameterOverrides: {
      externalId,
    },
  }),
  template: StackSetTemplate.fromStackSetStack(drataStackSet),
  capabilities: [Capability.NAMED_IAM],
});

// Consider if the following two workarounds are still necessary:

// See https://github.com/cdklabs/cdk-stacksets/pull/678
if (selfManaged.role) {
  selfManaged.node.addDependency(selfManaged.role);
}

// See https://github.com/cdklabs/cdk-stacksets/issues/115
for (const stackSet of [serviceManaged, selfManaged]) {
  const cfnStackSet = stackSet.node.defaultChild as CfnStackSet;
  cfnStackSet.addOverride('Properties.Parameters', [
    {
      ParameterKey: 'externalId',
      ParameterValue: '',
    },
  ]);
}
