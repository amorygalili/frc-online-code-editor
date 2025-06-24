## Steps

- Create dockerfile with base image that supports 2025 WPILib on linux
- Copy latest linux release of WPILib from https://github.com/wpilibsuite/allwpilib/releases/tag/v2025.3.2 to container in dockerfile
- Enable novnc so installer can be run through browser interface
- Run installer


## Installing and running

```bash
# Build image
docker build -t frc-sim .
```

```bash
# Run container
docker run -it -p 6901:6901 -p 5901:5901 -p 6080:6080 frc-sim /bin/bash
docker run -p 6901:6901 -p 5901:5901 frc-sim
```

Go to http://localhost:6901/vnc.html in browser and enter password "password"