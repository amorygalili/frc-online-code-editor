# FRC Programming Fundamentals - Challenge Repository

This repository contains a collection of fundamental FRC programming challenges designed for beginners learning robot programming with WPILib.

## Repository Structure

```
├── challenges.json              # Repository metadata and challenge list
├── challenges/
│   ├── hello-robot-world/       # Basic robot programming introduction
│   │   ├── metadata.json        # Challenge configuration
│   │   ├── starter-code/robot/  # Robot code files (Robot.java, Main.java, etc.)
│   │   └── instructions.md      # Challenge instructions
│   ├── basic-motor-control/     # Motor control fundamentals
│   └── sensor-reading/          # Sensor integration basics
└── README.md                    # This file
```

## How to Use This Repository

### For Students
1. This repository is designed to be imported into the FRC Challenge Platform
2. Your instructor will provide the platform URL where you can access these challenges
3. Each challenge includes starter code, instructions, and automated testing

### For Instructors
1. Import this repository into your FRC Challenge Platform instance
2. Students can then access and work on these challenges through the web interface
3. Monitor student progress through the platform's dashboard

### For Challenge Creators
Use this repository as a template for creating your own challenge collections:

1. Fork this repository
2. Modify `challenges.json` to describe your challenge collection
3. Create new challenge directories following the established structure
4. Each challenge needs:
   - `metadata.json` - Challenge configuration and metadata
   - `starter-code/robot/` - Robot code files (Robot.java, Main.java, etc.)
   - `instructions.md` - Challenge instructions

## Challenge Metadata Format

### Root challenges.json
```json
{
  "version": "1.0",
  "repository": {
    "name": "Repository Name",
    "description": "Description of the challenge collection",
    "author": "Author Name",
    "license": "MIT",
    "website": "https://example.com"
  },
  "challenges": [
    {
      "id": "challenge-id",
      "path": "challenges/challenge-directory",
      "enabled": true
    }
  ]
}
```

### Individual Challenge metadata.json
```json
{
  "id": "challenge-id",
  "title": "Challenge Title",
  "description": "Brief description",
  "difficulty": "Beginner|Intermediate|Advanced",
  "category": "Category Name",
  "estimatedTime": "15 min",
  "version": "1.0",
  "prerequisites": [],
  "tags": ["tag1", "tag2"],
  "files": {
    "instructions": "instructions.md"
  }
}
```

## Available Challenges

### 1. Hello Robot World
- **Difficulty**: Beginner
- **Time**: 15 minutes
- **Topics**: Robot class basics, initialization, periodic methods
- **Description**: Learn the fundamental structure of FRC robot programs

### 2. Basic Motor Control
- **Difficulty**: Beginner  
- **Time**: 30 minutes
- **Topics**: Motor controllers, PWM, basic movement
- **Description**: Control motors and make your robot move

### 3. Sensor Reading
- **Difficulty**: Intermediate
- **Time**: 45 minutes
- **Topics**: Digital/analog sensors, encoder feedback
- **Description**: Read sensor values and use them in your robot code

## Contributing

To contribute new challenges or improvements:

1. Fork this repository
2. Create a new branch for your changes
3. Add your challenge following the established structure
4. Test your challenge thoroughly
5. Submit a pull request with a clear description

## License

This challenge collection is licensed under the MIT License. See individual challenge directories for specific licensing information.

## Support

For questions about these challenges:
- Check the challenge instructions and hints
- Review the WPILib documentation
- Ask your instructor or mentor
- Visit the FRC programming forums

## WPILib Version

These challenges are designed for WPILib 2025.1.1. If you're using a different version, you may need to make minor adjustments to the code.

---

Happy coding, and welcome to FRC programming! 🤖
