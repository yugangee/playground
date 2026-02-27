import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as sns from 'aws-cdk-lib/aws-sns'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs'

export class PlaygroundStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // ─── Cognito User Pool ───────────────────────────────────────────
    // 기존 playground-users 풀 (us-east-1_dolZhFZDJ) import — 실제 사용자 데이터 보존
    const userPool = cognito.UserPool.fromUserPoolId(this, 'UserPool', 'us-east-1_dolZhFZDJ')
    const userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
      this, 'UserPoolClient', '2m16g04t6prj9p79m7h12adn11'
    )

    // ─── DynamoDB Tables ─────────────────────────────────────────────
    const tables = {
      users: new dynamodb.Table(this, 'UsersTable', {
        tableName: 'pg-users',
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      teams: new dynamodb.Table(this, 'TeamsTable', {
        tableName: 'pg-teams',
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      matches: new dynamodb.Table(this, 'MatchesTable', {
        tableName: 'pg-matches',
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      leagues: new dynamodb.Table(this, 'LeaguesTable', {
        tableName: 'pg-leagues',
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      finance: new dynamodb.Table(this, 'FinanceTable', {
        tableName: 'pg-finance',
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      teamMembers: new dynamodb.Table(this, 'TeamMembersTable', {
        tableName: 'pg-team-members',
        partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      announcements: new dynamodb.Table(this, 'AnnouncementsTable', {
        tableName: 'pg-announcements',
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      polls: new dynamodb.Table(this, 'PollsTable', {
        tableName: 'pg-polls',
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      pollVotes: new dynamodb.Table(this, 'PollVotesTable', {
        tableName: 'pg-poll-votes',
        partitionKey: { name: 'pollId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      attendance: new dynamodb.Table(this, 'AttendanceTable', {
        tableName: 'pg-attendance',
        partitionKey: { name: 'matchId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      leagueTeams: new dynamodb.Table(this, 'LeagueTeamsTable', {
        tableName: 'pg-league-teams',
        partitionKey: { name: 'leagueId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      leagueMatches: new dynamodb.Table(this, 'LeagueMatchesTable', {
        tableName: 'pg-league-matches',
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      dues: new dynamodb.Table(this, 'DuesTable', {
        tableName: 'pg-dues',
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      fines: new dynamodb.Table(this, 'FinesTable', {
        tableName: 'pg-fines',
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      friends: new dynamodb.Table(this, 'FriendsTable', {
        tableName: 'pg-friends',
        partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'friendId', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      favorites: new dynamodb.Table(this, 'FavoritesTable', {
        tableName: 'pg-favorites',
        partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'targetId', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      stats: new dynamodb.Table(this, 'StatsTable', {
        tableName: 'pg-stats',
        partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      uniforms: new dynamodb.Table(this, 'UniformsTable', {
        tableName: 'pg-uniforms',
        partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      equipment: new dynamodb.Table(this, 'EquipmentTable', {
        tableName: 'pg-equipment',
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      recruitment: new dynamodb.Table(this, 'RecruitmentTable', {
        tableName: 'pg-recruitment',
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      invites: new dynamodb.Table(this, 'InvitesTable', {
        tableName: 'pg-invites',
        partitionKey: { name: 'token', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    }

    // GSI for team-members userId queries (for GET /team endpoint)
    tables.teamMembers.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    })

    // GSI for finance teamId+date queries
    tables.finance.addGlobalSecondaryIndex({
      indexName: 'teamId-date-index',
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
    })
    tables.leagues.addGlobalSecondaryIndex({
      indexName: 'organizerTeamId-index',
      partitionKey: { name: 'organizerTeamId', type: dynamodb.AttributeType.STRING },
    })
    tables.leagues.addGlobalSecondaryIndex({
      indexName: 'isPublic-createdAt-index',
      partitionKey: { name: 'isPublic', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })
    tables.leagueMatches.addGlobalSecondaryIndex({
      indexName: 'leagueId-index',
      partitionKey: { name: 'leagueId', type: dynamodb.AttributeType.STRING },
    })

    // GSI for teamId-based queries
    tables.announcements.addGlobalSecondaryIndex({
      indexName: 'teamId-createdAt-index',
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })
    tables.polls.addGlobalSecondaryIndex({
      indexName: 'teamId-createdAt-index',
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    tables.dues.addGlobalSecondaryIndex({
      indexName: 'teamId-index',
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
    })
    tables.fines.addGlobalSecondaryIndex({
      indexName: 'teamId-index',
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
    })
    tables.equipment.addGlobalSecondaryIndex({
      indexName: 'teamId-index',
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
    })
    tables.recruitment.addGlobalSecondaryIndex({
      indexName: 'teamId-index',
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
    })

    // ─── S3 Bucket ───────────────────────────────────────────────────
    const assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: `playground-assets-${this.account}`,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // ─── SNS (Push Notifications) ────────────────────────────────────
    const notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: 'playground-notifications',
    })

    // ─── Lambda Functions ────────────────────────────────────────────
    const commonEnv = {
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      ASSETS_BUCKET: assetsBucket.bucketName,
      SNS_TOPIC_ARN: notificationTopic.topicArn,
      USERS_TABLE: tables.users.tableName,
      TEAMS_TABLE: tables.teams.tableName,
      TEAM_MEMBERS_TABLE: tables.teamMembers.tableName,
      MATCHES_TABLE: tables.matches.tableName,
      LEAGUES_TABLE: tables.leagues.tableName,
      FINANCE_TABLE: tables.finance.tableName,
      DUES_TABLE: tables.dues.tableName,
      FINES_TABLE: tables.fines.tableName,
      ANNOUNCEMENTS_TABLE: tables.announcements.tableName,
      POLLS_TABLE: tables.polls.tableName,
      POLL_VOTES_TABLE: tables.pollVotes.tableName,
      ATTENDANCE_TABLE: tables.attendance.tableName,
      LEAGUE_TEAMS_TABLE: tables.leagueTeams.tableName,
      LEAGUE_MATCHES_TABLE: tables.leagueMatches.tableName,
      FRIENDS_TABLE: tables.friends.tableName,
      FAVORITES_TABLE: tables.favorites.tableName,
      STATS_TABLE: tables.stats.tableName,
      UNIFORMS_TABLE: tables.uniforms.tableName,
      EQUIPMENT_TABLE: tables.equipment.tableName,
      RECRUITMENT_TABLE: tables.recruitment.tableName,
      INVITES_TABLE: tables.invites.tableName,
    }

    const lambdaDefaults = {
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: commonEnv,
      bundling: {
        forceDockerBundling: false, // Docker 없이 로컬 esbuild 사용
      },
    }

    const functions = {
      team: new NodejsFunction(this, 'TeamFunction', {
        ...lambdaDefaults,
        entry: '../functions/team/index.ts',
        functionName: 'playground-team',
      }),
      finance: new NodejsFunction(this, 'FinanceFunction', {
        ...lambdaDefaults,
        entry: '../functions/finance/index.ts',
        functionName: 'playground-finance',
      }),
      schedule: new NodejsFunction(this, 'ScheduleFunction', {
        ...lambdaDefaults,
        entry: '../functions/schedule/index.ts',
        functionName: 'playground-schedule',
      }),
      league: new NodejsFunction(this, 'LeagueFunction', {
        ...lambdaDefaults,
        entry: '../functions/league/index.ts',
        functionName: 'playground-league',
      }),
      notifications: new NodejsFunction(this, 'NotificationsFunction', {
        ...lambdaDefaults,
        entry: '../functions/notifications/index.ts',
        functionName: 'playground-notifications',
      }),
    }

    // Lambda에 DynamoDB, S3, SNS 권한 부여
    Object.values(tables).forEach(table => {
      Object.values(functions).forEach(fn => table.grantReadWriteData(fn))
    })
    Object.values(functions).forEach(fn => {
      assetsBucket.grantReadWrite(fn)
      notificationTopic.grantPublish(fn)
    })

    // ─── API Gateway ─────────────────────────────────────────────────
    const api = new apigateway.RestApi(this, 'PlaygroundApi', {
      restApiName: 'playground-api',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    })

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: 'playground-cognito-authorizer',
    })

    const authMethodOptions: apigateway.MethodOptions = {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    }

    const routes: [string, lambda.IFunction][] = [
      ['team', functions.team],
      ['finance', functions.finance],
      ['schedule', functions.schedule],
      ['league', functions.league],
      ['notifications', functions.notifications],
      ['social', functions.notifications],
      ['discover', functions.notifications],
    ]

    routes.forEach(([path, fn]) => {
      const resource = api.root.addResource(path)
      resource.addMethod('ANY', new apigateway.LambdaIntegration(fn), authMethodOptions)
      resource.addResource('{proxy+}').addMethod('ANY', new apigateway.LambdaIntegration(fn), authMethodOptions)
    })

    // ─── Outputs ─────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url })
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId })
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId })
    new cdk.CfnOutput(this, 'AssetsBucketName', { value: assetsBucket.bucketName })
  }
}
