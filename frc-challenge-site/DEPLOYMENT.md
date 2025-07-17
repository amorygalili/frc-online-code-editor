# FRC Challenge Site - Deployment Guide

This guide covers deploying the FRC Challenge Site using the MVP architecture with Vercel for frontend hosting.

## 🚀 Quick Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account (free tier available)
- This repository pushed to GitHub

### Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial FRC Challenge Site setup"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect it's a Vite project
   - Click "Deploy"

3. **Configure Build Settings** (if needed)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Environment Variables

For production deployment, you'll need to add these environment variables in Vercel:

```
VITE_API_URL=https://your-api-gateway-url.amazonaws.com
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🔧 Local Development

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
src/
├── pages/              # Main application pages
│   ├── HomePage.tsx    # Landing page
│   ├── ChallengesPage.tsx # Challenge browser
│   ├── ChallengePage.tsx  # Individual challenge view
│   ├── LoginPage.tsx   # Authentication
│   └── ProfilePage.tsx # User profile
├── components/         # Reusable components
│   └── Navigation.tsx  # Main navigation
├── contexts/          # React contexts (existing)
├── App.tsx           # Main app with routing
└── EditorApp.tsx     # Monaco editor app (existing)
```

## 🔄 Next Steps

After deploying the frontend:

1. **Set up AWS Backend**
   - Create AWS Cognito User Pool
   - Set up Lambda functions for API
   - Configure API Gateway

2. **Connect Authentication**
   - Configure AWS Amplify
   - Update environment variables
   - Test Google OAuth flow

3. **Add Challenge Runtime**
   - Set up ECS Fargate for containers
   - Create challenge session management
   - Integrate with Monaco editor

## 🌐 Custom Domain

To use a custom domain with Vercel:

1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## 📊 Monitoring

Vercel provides built-in analytics and monitoring:
- Real-time performance metrics
- Error tracking
- Deployment logs
- Usage statistics

## 🔒 Security

Current security features:
- HTTPS by default
- Environment variable encryption
- Secure headers configuration
- SPA routing protection

## 💰 Cost Estimation

Vercel Free Tier includes:
- 100GB bandwidth per month
- Unlimited personal projects
- Automatic HTTPS
- Global CDN

For higher usage, Vercel Pro starts at $20/month.

## 🆘 Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify TypeScript compilation with `npm run build`
- Check for missing environment variables

### Routing Issues
- Ensure `vercel.json` has proper rewrites configuration
- Check that all routes are defined in `App.tsx`

### Performance Issues
- Use Vercel Analytics to identify bottlenecks
- Optimize bundle size with `npm run build -- --analyze`
- Consider code splitting for large components

## 📞 Support

- Vercel Documentation: https://vercel.com/docs
- GitHub Issues: Create issues in your repository
- Community: Vercel Discord or GitHub Discussions
