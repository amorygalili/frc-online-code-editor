## Install tools to access container

```powershell
# Download and install Session Manager plugin
Invoke-WebRequest -Uri "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/windows/SessionManagerPluginSetup.exe" -OutFile "SessionManagerPluginSetup.exe"
.\SessionManagerPluginSetup.exe

# Or if you have Chocolatey:
choco install awscli-session-manager
```

## Test WS through ALB

```bash
npm install -g wscat
wscat -c ws://your-alb-dns/your-ws-path
```

## Connect to container

```bash
# List tasks
aws ecs list-tasks --cluster frc-challenge-site-dev-cluster --region us-east-2

# Connect to container
aws ecs execute-command `
   --cluster frc-challenge-site-dev-cluster `
   --task "arn:aws:ecs:us-east-2:025198855585:task/frc-challenge-site-dev-cluster/224f3eb7228c464bbb0316a851f15b7f" `
   --container wpilib-editor `
   --interactive `
   --command "/bin/bash" `
   --region us-east-2


# Install vim
apt update
apt install -y vim


# find process for language server
ps aux | grep language-server.js

# kill process
kill PID

# rerun server
node language-server.js &
```