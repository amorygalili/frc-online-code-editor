# 🔧 Vercel Environment Variables Setup

After setting up AWS Cognito, you need to configure environment variables in Vercel for production authentication.

## Prerequisites

✅ AWS Cognito User Pool created (follow `AWS_COGNITO_SETUP.md`)  
✅ Google OAuth configured  
✅ Site deployed to Vercel  

## Step 1: Gather Your AWS Cognito Values

From your AWS Cognito setup, collect these values:

1. **User Pool ID**: `us-east-1_XXXXXXXXX`
2. **App Client ID**: `xxxxxxxxxxxxxxxxxxxxxxxxxx`
3. **Cognito Domain**: `https://your-domain.auth.us-east-1.amazoncognito.com`
4. **AWS Region**: `us-east-1` (or your chosen region)

## Step 2: Configure Vercel Environment Variables

### Option A: Via Vercel Dashboard (Recommended)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your FRC Challenge Site project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_AWS_REGION` | `us-east-1` | Production, Preview, Development |
| `VITE_COGNITO_USER_POOL_ID` | `us-east-1_XXXXXXXXX` | Production, Preview, Development |
| `VITE_COGNITO_USER_POOL_CLIENT_ID` | `xxxxxxxxxxxxxxxxxxxxxxxxxx` | Production, Preview, Development |
| `VITE_COGNITO_DOMAIN` | `https://your-domain.auth.us-east-1.amazoncognito.com` | Production, Preview, Development |
| `VITE_COGNITO_REDIRECT_SIGN_IN` | `https://your-site.vercel.app/` | Production |
| `VITE_COGNITO_REDIRECT_SIGN_OUT` | `https://your-site.vercel.app/` | Production |

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variables
vercel env add VITE_AWS_REGION
vercel env add VITE_COGNITO_USER_POOL_ID
vercel env add VITE_COGNITO_USER_POOL_CLIENT_ID
vercel env add VITE_COGNITO_DOMAIN
vercel env add VITE_COGNITO_REDIRECT_SIGN_IN
vercel env add VITE_COGNITO_REDIRECT_SIGN_OUT
```

## Step 3: Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client
4. Update **Authorized JavaScript origins**:
   ```
   https://your-vercel-site.vercel.app
   ```
5. Update **Authorized redirect URIs**:
   ```
   https://your-cognito-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```

## Step 4: Update AWS Cognito Settings

1. Go to [AWS Cognito Console](https://console.aws.amazon.com/cognito/)
2. Select your User Pool
3. Go to **App integration** tab
4. Edit your App client
5. Update **Allowed callback URLs**:
   ```
   https://your-vercel-site.vercel.app/
   ```
6. Update **Allowed sign-out URLs**:
   ```
   https://your-vercel-site.vercel.app/
   ```

## Step 5: Redeploy Your Site

After setting environment variables:

1. Go to your Vercel project dashboard
2. Go to **Deployments** tab
3. Click **Redeploy** on the latest deployment
4. Or push a new commit to trigger automatic deployment

## Step 6: Test Authentication

1. Visit your live site: `https://your-site.vercel.app`
2. Click **Login** in the navigation
3. Click **Continue with Google**
4. You should be redirected to Google OAuth
5. After signing in, you should be redirected back to your site
6. You should see your name in the navigation bar

## Troubleshooting

### Common Issues

**❌ "Demo Mode" banner still showing**
- Check that all environment variables are set correctly
- Redeploy the site after setting variables

**❌ "Invalid redirect URI" error**
- Verify Google OAuth redirect URIs match exactly
- Check AWS Cognito callback URLs are correct
- Ensure no trailing slashes mismatch

**❌ Authentication not working**
- Check browser console for errors
- Verify all environment variables are set
- Check AWS CloudWatch logs for Cognito errors

**❌ "Client not found" error**
- Double-check your Cognito App Client ID
- Ensure the User Pool ID is correct

### Debug Steps

1. **Check Environment Variables**:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Verify all values are set and correct

2. **Check Browser Console**:
   - Open Developer Tools → Console
   - Look for authentication-related errors

3. **Test Locally**:
   - Copy environment variables to `.env.local`
   - Run `npm run dev` and test authentication

4. **Check AWS Logs**:
   - Go to AWS CloudWatch
   - Look for Cognito-related error logs

## Security Notes

🔒 **Important Security Considerations**:

- Environment variables starting with `VITE_` are exposed to the client
- Never put sensitive secrets in `VITE_` variables
- AWS Cognito App Client ID is safe to expose (it's designed for client-side use)
- User Pool ID is also safe to expose
- Keep your Google OAuth Client Secret secure (don't put it in Vercel env vars)

## Next Steps

Once authentication is working:

1. ✅ Users can sign in with Google
2. ✅ User sessions persist across page reloads
3. ✅ Navigation shows user info when logged in
4. ✅ Ready for Step 3: API integration

---

**🎉 Congratulations!** Your FRC Challenge Site now has production-ready Google OAuth authentication!
