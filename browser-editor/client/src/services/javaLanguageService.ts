import * as monaco from 'monaco-editor';

// Java Language Service Configuration
export interface JavaLanguageServiceOptions {
  classpath?: string[];
  sourceRoots?: string[];
  projectRoot?: string;
}

// Type definitions for FRC classes
interface MethodInfo {
  name: string;
  returnType: string;
  params: string[];
  description: string;
}

interface ClassInfo {
  package: string;
  methods: MethodInfo[];
}

// FRC/WPILib specific class definitions for autocompletion
const FRC_CLASSES: Record<string, ClassInfo> = {
  'CommandXboxController': {
    package: 'edu.wpi.first.wpilibj2.command.button',
    methods: [
      { name: 'a', returnType: 'Trigger', params: [], description: 'Get the A button trigger' },
      { name: 'b', returnType: 'Trigger', params: [], description: 'Get the B button trigger' },
      { name: 'x', returnType: 'Trigger', params: [], description: 'Get the X button trigger' },
      { name: 'y', returnType: 'Trigger', params: [], description: 'Get the Y button trigger' },
      { name: 'leftBumper', returnType: 'Trigger', params: [], description: 'Get the left bumper trigger' },
      { name: 'rightBumper', returnType: 'Trigger', params: [], description: 'Get the right bumper trigger' },
      { name: 'leftTrigger', returnType: 'Trigger', params: [], description: 'Get the left trigger axis' },
      { name: 'rightTrigger', returnType: 'Trigger', params: [], description: 'Get the right trigger axis' },
      { name: 'leftStick', returnType: 'Trigger', params: [], description: 'Get the left stick button trigger' },
      { name: 'rightStick', returnType: 'Trigger', params: [], description: 'Get the right stick button trigger' },
      { name: 'start', returnType: 'Trigger', params: [], description: 'Get the start button trigger' },
      { name: 'back', returnType: 'Trigger', params: [], description: 'Get the back button trigger' },
      { name: 'getLeftX', returnType: 'double', params: [], description: 'Get the left stick X axis value' },
      { name: 'getLeftY', returnType: 'double', params: [], description: 'Get the left stick Y axis value' },
      { name: 'getRightX', returnType: 'double', params: [], description: 'Get the right stick X axis value' },
      { name: 'getRightY', returnType: 'double', params: [], description: 'Get the right stick Y axis value' },
    ]
  },
  'Trigger': {
    package: 'edu.wpi.first.wpilibj2.command.button',
    methods: [
      { name: 'onTrue', returnType: 'Trigger', params: ['Command'], description: 'Execute command when trigger becomes true' },
      { name: 'onFalse', returnType: 'Trigger', params: ['Command'], description: 'Execute command when trigger becomes false' },
      { name: 'whileTrue', returnType: 'Trigger', params: ['Command'], description: 'Execute command while trigger is true' },
      { name: 'whileFalse', returnType: 'Trigger', params: ['Command'], description: 'Execute command while trigger is false' },
      { name: 'toggleOnTrue', returnType: 'Trigger', params: ['Command'], description: 'Toggle command when trigger becomes true' },
    ]
  },
  'Command': {
    package: 'edu.wpi.first.wpilibj2.command',
    methods: [
      { name: 'schedule', returnType: 'void', params: [], description: 'Schedule this command' },
      { name: 'cancel', returnType: 'void', params: [], description: 'Cancel this command' },
      { name: 'isScheduled', returnType: 'boolean', params: [], description: 'Check if command is scheduled' },
    ]
  },
  'Subsystem': {
    package: 'edu.wpi.first.wpilibj2.command',
    methods: [
      { name: 'setDefaultCommand', returnType: 'void', params: ['Command'], description: 'Set the default command for this subsystem' },
      { name: 'getDefaultCommand', returnType: 'Command', params: [], description: 'Get the default command for this subsystem' },
      { name: 'getCurrentCommand', returnType: 'Command', params: [], description: 'Get the current command running on this subsystem' },
    ]
  },
  'ExampleSubsystem': {
    package: 'frc.robot.subsystems',
    methods: [
      { name: 'exampleCondition', returnType: 'boolean', params: [], description: 'Example condition method' },
      { name: 'exampleMethodCommand', returnType: 'Command', params: [], description: 'Example method command' },
      { name: 'setDefaultCommand', returnType: 'void', params: ['Command'], description: 'Set the default command for this subsystem' },
    ]
  },
  'ExampleCommand': {
    package: 'frc.robot.commands',
    methods: [
      { name: 'schedule', returnType: 'void', params: [], description: 'Schedule this command' },
      { name: 'cancel', returnType: 'void', params: [], description: 'Cancel this command' },
      { name: 'isScheduled', returnType: 'boolean', params: [], description: 'Check if command is scheduled' },
    ]
  },
  'Autos': {
    package: 'frc.robot.commands',
    methods: [
      { name: 'exampleAuto', returnType: 'Command', params: ['ExampleSubsystem'], description: 'Example autonomous command' },
    ]
  }
};

export class JavaLanguageService {
  private options: JavaLanguageServiceOptions;
  private variableTypes: Map<string, string> = new Map();

  constructor(options: JavaLanguageServiceOptions = {}) {
    this.options = options;
  }

  // Parse variable declarations to track types
  private parseVariableDeclarations(code: string): void {
    this.variableTypes.clear();

    // Match field declarations like: private final CommandXboxController m_driverController
    const fieldPattern = /(?:private|public|protected)?\s*(?:final|static)?\s*(\w+)\s+(\w+)\s*[=;]/g;
    let match;

    while ((match = fieldPattern.exec(code)) !== null) {
      const type = match[1];
      const varName = match[2];
      console.log(`🔍 Found variable: ${varName} -> ${type}`);
      this.variableTypes.set(varName, type);
    }

    // Also match constructor parameters and local variables
    const constructorPattern = /(\w+)\s+(\w+)\s*\)/g;
    while ((match = constructorPattern.exec(code)) !== null) {
      const type = match[1];
      const varName = match[2];
      this.variableTypes.set(varName, type);
    }

    // Match method chaining return types
    const chainPattern = /(\w+)\.(\w+)\(\)/g;
    while ((match = chainPattern.exec(code)) !== null) {
      const objectName = match[1];
      const methodName = match[2];
      const objectType = this.variableTypes.get(objectName);

      if (objectType && FRC_CLASSES[objectType as keyof typeof FRC_CLASSES]) {
        const classInfo = FRC_CLASSES[objectType as keyof typeof FRC_CLASSES];
        const method = classInfo.methods.find(m => m.name === methodName);
        if (method && method.returnType !== 'void') {
          // For method chaining, we could track intermediate results
          // This is a simplified version
        }
      }
    }
  }

  // Get completion items for a given position
  public getCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): monaco.languages.CompletionItem[] {
    console.log('🔍 Java Language Service: getCompletionItems called');
    const code = model.getValue();
    this.parseVariableDeclarations(code);
    console.log('📝 Variable types found:', this.variableTypes);

    const textUntilPosition = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });
    console.log('📍 Text until position:', textUntilPosition);

    // Check if we're after a dot (method/field access)
    const lastDotIndex = textUntilPosition.lastIndexOf('.');
    console.log('🔍 Last dot index:', lastDotIndex);

    if (lastDotIndex !== -1) {
      const beforeDot = textUntilPosition.substring(0, lastDotIndex);
      console.log('⬅️ Before dot:', beforeDot);

      // Handle method chaining like m_driverController.a().onTrue(
      const chainMatch = beforeDot.match(/(\w+)(?:\.(\w+)\(\))*$/);
      console.log('🔗 Chain match:', chainMatch);

      if (chainMatch) {
        const rootObjectName = chainMatch[1];
        console.log('🎯 Root object name:', rootObjectName);
        let currentType = this.variableTypes.get(rootObjectName);
        console.log('🏷️ Current type from variable map:', currentType);

        // If we have method chaining, determine the final type
        const methodCalls = beforeDot.match(/\.(\w+)\(\)/g);
        if (methodCalls && currentType) {
          for (const methodCall of methodCalls) {
            const methodName = methodCall.substring(1, methodCall.length - 2); // Remove . and ()
            if (FRC_CLASSES[currentType as keyof typeof FRC_CLASSES]) {
              const classInfo: ClassInfo = FRC_CLASSES[currentType as keyof typeof FRC_CLASSES];
              const method: MethodInfo | undefined = classInfo.methods.find((m: MethodInfo) => m.name === methodName);
              if (method && method.returnType !== 'void') {
                currentType = method.returnType;
              }
            }
          }
        }

        // Simple object match for direct access
        const simpleMatch = beforeDot.match(/(\w+)\s*$/);
        if (simpleMatch && !currentType) {
          const objectName = simpleMatch[1];
          currentType = this.variableTypes.get(objectName);
        }

        if (currentType && FRC_CLASSES[currentType as keyof typeof FRC_CLASSES]) {
          console.log('✅ Found FRC class for type:', currentType);
          const classInfo: ClassInfo = FRC_CLASSES[currentType as keyof typeof FRC_CLASSES];
          console.log('📋 Available methods:', classInfo.methods.map(m => m.name));
          return classInfo.methods.map((method: MethodInfo) => {
            const item: monaco.languages.CompletionItem = {
              label: `${method.name}()`,
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: method.params.length > 0 ? `${method.name}($0)` : `${method.name}()`,
              documentation: method.description,
              detail: `${method.returnType} ${method.name}(${method.params.join(', ')})`,
              range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
            };
            if (method.params.length > 0) {
              item.insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
            }
            return item;
          });
        }
      }
    }

    // Basic class suggestions
    const suggestions: monaco.languages.CompletionItem[] = [];
    
    // Add FRC class suggestions
    Object.keys(FRC_CLASSES).forEach(className => {
      suggestions.push({
        label: className,
        kind: monaco.languages.CompletionItemKind.Class,
        insertText: className,
        documentation: `${FRC_CLASSES[className as keyof typeof FRC_CLASSES].package}.${className}`,
        detail: `class ${className}`,
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
      });
    });

    // Add common Java keywords and constructs
    const javaKeywords = [
      'public', 'private', 'protected', 'static', 'final', 'abstract',
      'class', 'interface', 'extends', 'implements', 'import', 'package',
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
      'try', 'catch', 'finally', 'throw', 'throws', 'return', 'break', 'continue',
      'new', 'this', 'super', 'null', 'true', 'false'
    ];

    javaKeywords.forEach(keyword => {
      suggestions.push({
        label: keyword,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: keyword,
        documentation: `Java keyword: ${keyword}`,
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
      });
    });

    return suggestions;
  }

  // Get hover information
  public getHoverInfo(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): monaco.languages.Hover | null {
    const word = model.getWordAtPosition(position);
    if (!word) return null;

    const wordText = word.word;
    
    // Check if it's a known FRC class
    if (FRC_CLASSES[wordText as keyof typeof FRC_CLASSES]) {
      const classInfo: ClassInfo = FRC_CLASSES[wordText as keyof typeof FRC_CLASSES];
      return {
        range: new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        ),
        contents: [
          { value: `**${wordText}**` },
          { value: `Package: ${classInfo.package}` },
          { value: `FRC/WPILib class for robot programming` }
        ]
      };
    }

    return null;
  }

  // Get signature help for method calls
  public getSignatureHelp(
    _model: monaco.editor.ITextModel,
    _position: monaco.Position
  ): monaco.languages.SignatureHelpResult | null {
    // Implementation for method signature help would go here
    // For now, return null to indicate no signature help available
    return null;
  }
}

// Register the Java language service with Monaco
export function registerJavaLanguageService(options: JavaLanguageServiceOptions = {}): void {
  console.log('🚀 Registering Java Language Service...');
  const javaService = new JavaLanguageService(options);

  // First, ensure Java language is registered and check current model language
  const languages = monaco.languages.getLanguages();
  console.log('📋 Available languages:', languages.map(l => l.id));

  const javaLang = languages.find(l => l.id === 'java');
  if (!javaLang) {
    console.log('⚠️ Java language not found, registering it...');
    monaco.languages.register({ id: 'java' });

    // Set language configuration for better Java support
    monaco.languages.setLanguageConfiguration('java', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"', notIn: ['string'] },
        { open: "'", close: "'", notIn: ['string', 'comment'] }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ]
    });
  } else {
    console.log('✅ Java language already registered');
  }

  // Register completion provider with trigger characters
  console.log('📝 Registering completion provider...');

  // Try multiple registration approaches
  const completionProvider1 = monaco.languages.registerCompletionItemProvider('java', {
    triggerCharacters: ['.', ' '],
    provideCompletionItems: (model, position, context, _token) => {
      console.log('🔥🔥🔥 COMPLETION PROVIDER CALLED! 🔥🔥🔥');
      console.log('📄 Model language:', model.getLanguageId());
      console.log('📍 Position:', position.lineNumber + ':' + position.column);
      console.log('🎯 Context trigger kind:', context.triggerKind);
      console.log('🔤 Trigger character:', context.triggerCharacter);

      // Always return some test suggestions to verify the provider works
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column,
        endColumn: position.column
      };

      const testSuggestions: monaco.languages.CompletionItem[] = [
        {
          label: 'TEST_COMPLETION',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: 'TEST_COMPLETION()',
          detail: '🧪 Test completion item',
          documentation: 'This proves the completion provider is working!',
          range: range
        },
        {
          label: 'println',
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: 'println("Hello World!")',
          detail: 'System.out.println',
          documentation: 'Print a line to the console',
          range: range
        },
        {
          label: 'System',
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: 'System',
          detail: 'java.lang.System',
          documentation: 'System class',
          range: range
        }
      ];

      try {
        const suggestions = javaService.getCompletionItems(model, position);
        const allSuggestions = [...testSuggestions, ...suggestions];
        console.log('📤 Returning suggestions count:', allSuggestions.length);
        console.log('📋 Suggestion labels:', allSuggestions.map(s => s.label));
        return { suggestions: allSuggestions };
      } catch (error) {
        console.error('❌ Error in completion provider:', error);
        return { suggestions: testSuggestions };
      }
    }
  });

  // Also register without trigger characters to catch all completion requests
  const completionProvider2 = monaco.languages.registerCompletionItemProvider('java', {
    provideCompletionItems: (model, position, context, _token) => {
      console.log('🔥🔥🔥 FALLBACK COMPLETION PROVIDER CALLED! 🔥🔥🔥');
      console.log('📄 Model language:', model.getLanguageId());
      console.log('📍 Position:', position.lineNumber + ':' + position.column);
      console.log('🎯 Context trigger kind:', context.triggerKind);

      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column,
        endColumn: position.column
      };

      return {
        suggestions: [
          {
            label: 'FALLBACK_TEST',
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: 'FALLBACK_TEST()',
            detail: '🔄 Fallback completion',
            documentation: 'This is the fallback completion provider!',
            range: range
          }
        ]
      };
    }
  });

  console.log('✅ Completion providers registered:', !!completionProvider1 && !!completionProvider2);

  // Register hover provider
  console.log('🖱️ Registering hover provider...');
  monaco.languages.registerHoverProvider('java', {
    provideHover: (model, position) => {
      console.log('🔥 HOVER PROVIDER CALLED!');
      console.log('📄 Model language:', model.getLanguageId());
      return javaService.getHoverInfo(model, position);
    }
  });

  // Register signature help provider
  console.log('✍️ Registering signature help provider...');
  monaco.languages.registerSignatureHelpProvider('java', {
    signatureHelpTriggerCharacters: ['(', ','],
    provideSignatureHelp: (model, position, _token, _context) => {
      console.log('🔥 SIGNATURE HELP PROVIDER CALLED!');
      console.log('📄 Model language:', model.getLanguageId());
      return javaService.getSignatureHelp(model, position);
    }
  });

  console.log('✅ All Java Language Service providers registered successfully!');
}
