# 🔐 AWS Cognito Setup Guide

This guide will walk you through setting up AWS Cognito with Google OAuth for your FRC Challenge Site.

## Prerequisites

- AWS Account (free tier is sufficient)
- Google Cloud Console access
- Your deployed Vercel site URL

## Part 1: Set up Google OAuth

### Step 1: Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **"Create Credentials"** > **"OAuth 2.0 Client IDs"**
5. Configure the OAuth consent screen if prompted:
   - Application name: "FRC Challenge Site"
   - User support email: Your email
   - Developer contact: Your email

### Step 2: Configure OAuth Client

1. Application type: **Web application**
2. Name: **FRC Challenge Site**
3. Authorized JavaScript origins:
   ```
   https://your-vercel-site.vercel.app
   http://localhost:5173
   ```
4. Authorized redirect URIs:
   ```
   https://your-cognito-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```
   (We'll get the Cognito domain in the next section)

5. Click **"Create"**
6. **Save the Client ID and Client Secret** - you'll need these!

## Part 2: Create AWS Cognito User Pool

### Step 1: Create User Pool

1. Go to [AWS Cognito Console](https://console.aws.amazon.com/cognito/)
2. Click **"Create user pool"**
3. **Step 1 - Configure sign-in experience:**
   - Provider types: **Federated identity providers**
   - Cognito user pool sign-in options: **Email**
   - Federated sign-in options: **Google**

### Step 2: Configure Security Requirements

1. **Password policy**: Use Cognito defaults
2. **Multi-factor authentication**: No MFA (for simplicity)
3. **User account recovery**: Email only

### Step 3: Configure Sign-up Experience

1. **Self-service sign-up**: Enable
2. **Cognito-assisted verification**: Email
3. **Required attributes**: 
   - Email (already selected)
   - Name
4. **Custom attributes**: None needed

### Step 4: Configure Message Delivery

1. **Email provider**: Send email with Cognito
2. **SMS**: Not needed

### Step 5: Integrate Your App

1. **User pool name**: `frc-challenge-site-users`
2. **App client name**: `frc-challenge-site-client`
3. **Client secret**: Generate a client secret
4. **Advanced app client settings**:
   - **Authentication flows**: 
     - ✅ ALLOW_USER_SRP_AUTH
     - ✅ ALLOW_REFRESH_TOKEN_AUTH
   - **OAuth 2.0 settings**:
     - ✅ Authorization code grant
     - ✅ Implicit grant
   - **OpenID Connect scopes**:
     - ✅ Email
     - ✅ OpenID
     - ✅ Profile
   - **Allowed callback URLs**:
     ```
     https://your-vercel-site.vercel.app/
     http://localhost:5173/
     ```
   - **Allowed sign-out URLs**:
     ```
     https://your-vercel-site.vercel.app/
     http://localhost:5173/
     ```

### Step 6: Review and Create

1. Review all settings
2. Click **"Create user pool"**
3. **Save these values**:
   - User Pool ID
   - App Client ID
   - App Client Secret
   - Cognito Domain (we'll create this next)

## Part 3: Configure Google Identity Provider

### Step 1: Add Google as Identity Provider

1. In your User Pool, go to **"Sign-in experience"** tab
2. Click **"Add identity provider"**
3. Select **"Google"**
4. Enter your Google OAuth credentials:
   - **Google app ID**: Your Google Client ID
   - **Google app secret**: Your Google Client Secret
5. **Authorize scopes**: `profile email openid`
6. **Attribute mapping**:
   - `email` → `email`
   - `name` → `name`
   - `picture` → `picture`

### Step 2: Create Cognito Domain

1. Go to **"App integration"** tab
2. Click **"Create Cognito domain"**
3. **Domain name**: `frc-challenge-site-[random-string]`
   (Must be globally unique)
4. Click **"Create domain"**
5. **Save the domain URL** - you'll need this!

### Step 3: Update Google OAuth Settings

1. Go back to Google Cloud Console
2. Edit your OAuth 2.0 Client
3. Update **Authorized redirect URIs** with your actual Cognito domain:
   ```
   https://your-cognito-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```

## Part 4: Test the Setup

### Step 1: Test Hosted UI

1. In Cognito, go to **"App integration"** tab
2. Click **"View Hosted UI"**
3. You should see a login page with Google option
4. Try signing in with Google
5. You should be redirected back to your callback URL

## Part 5: Environment Variables

Create these environment variables for your application:

```bash
# AWS Cognito Configuration
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_DOMAIN=https://your-cognito-domain.auth.us-east-1.amazoncognito.com

# Optional: For development
VITE_COGNITO_REDIRECT_SIGN_IN=http://localhost:5173/
VITE_COGNITO_REDIRECT_SIGN_OUT=http://localhost:5173/
```

## Next Steps

Once you have all the values above, we'll:

1. Install AWS Amplify in your React app
2. Configure authentication
3. Update your login/logout functionality
4. Deploy the changes to Vercel

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**: Make sure all URLs match exactly
2. **"Client not found"**: Check your Client ID is correct
3. **"Access denied"**: Verify Google OAuth consent screen is configured
4. **CORS errors**: Ensure your domain is in allowed origins

### Getting Help

- AWS Cognito Documentation
- Google OAuth 2.0 Documentation
- Check AWS CloudWatch logs for detailed errors
