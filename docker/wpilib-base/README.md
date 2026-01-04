## Creating an image

1. Run the container:

```bash
docker compose -f docker-compose.yml up --build
```

2. Open VNC client at `localhost:6901` with password `password`.

3. Within the VNC client install WPILib

4. Within the VNC client open the /workspace/RobotProject project. Build and simulate it.

5. Stop the container and commit the changes to a new image:

```bash
docker commit wpilib-base wpilib-base:2025.1
```

6. Tag and push the image to a registry:

```bash
docker tag wpilib-base:2025.1 agalili/wpilib-base:2025.1
docker push agalili/wpilib-base:2025.1
```
