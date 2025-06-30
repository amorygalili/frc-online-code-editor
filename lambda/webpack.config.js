const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'handlers/challenges/getChallenges': './src/handlers/challenges/getChallenges.ts',
    'handlers/challenges/getChallenge': './src/handlers/challenges/getChallenge.ts',
    'handlers/progress/getUserProgress': './src/handlers/progress/getUserProgress.ts',
    'handlers/progress/updateChallengeProgress': './src/handlers/progress/updateChallengeProgress.ts',
    'handlers/sessions/createChallengeSession': './src/handlers/sessions/createChallengeSession.ts',
    'handlers/sessions/saveChallengeCode': './src/handlers/sessions/saveChallengeCode.ts',
    'handlers/cors/options': './src/handlers/cors/options.ts',
    'scripts/seedData': './src/scripts/seedData.ts',
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  externals: {
    'aws-sdk': 'aws-sdk',
    '@aws-sdk/client-dynamodb': '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb': '@aws-sdk/lib-dynamodb',
    '@aws-sdk/client-cognito-identity-provider': '@aws-sdk/client-cognito-identity-provider',
  },
  optimization: {
    minimize: false,
  },
};
