## Creating an image

1. Run the container:

```bash
docker compose -f docker-compose.yml up --build
```

2. Stop the container and commit the changes to a new image:

```bash
docker commit wpilib-editor wpilib-editor:2025.0
```

6. Tag and push the image to a registry:

```bash
docker tag wpilib-editor:2025.0 agalili/wpilib-editor:2025.0
docker push agalili/wpilib-editor:2025.0
```
