import { App, Stack } from 'aws-cdk-lib';
import { AccountPrincipal, ManagedPolicy, Role } from 'aws-cdk-lib/aws-iam';

const yourAccounts = {
  drata: '987654321',
  management: '1234567890',
};

const app = new App();

const stack = new Stack(app, 'stackset-execution', {
  env: {
    account: yourAccounts.management,
  },
});

new Role(stack, 'StackSetExecutionRole', {
  roleName: 'AWSCloudFormationStackSetExecutionRole',
  managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')],
  assumedBy: new AccountPrincipal(yourAccounts.drata),
});
