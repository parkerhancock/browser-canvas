import { readFile, readdir, access } from "fs/promises"
import { join, basename } from "path"
import { homedir } from "os"
import chokidar, { type FSWatcher } from "chokidar"
import { transform } from "sucrase"

export interface ComponentInfo {
  name: string
  sourceCode: string      // Original JSX
  compiledCode: string    // Compiled JS (no JSX)
  source: "skill" | "global" | "project"
  path: string
}

interface ComponentDir {
  path: string
  source: "skill" | "global" | "project"
}

const components = new Map<string, ComponentInfo>()
let componentWatcher: FSWatcher | null = null
let onChangeCallback: (() => void) | null = null

// Resolved paths for component directories
let componentDirs: ComponentDir[] = []

/**
 * Initialize component directories based on server location and project root
 */
export function initComponentDirs(serverRoot: string, projectRoot?: string): void {
  componentDirs = [
    // Skill-level components (relative to server installation)
    { path: join(serverRoot, "skills/canvas/components"), source: "skill" as const },
    // Global user components
    { path: join(homedir(), ".claude/canvas/components"), source: "global" as const },
  ]

  // Add project-level components if project root is specified
  if (projectRoot) {
    componentDirs.push({
      path: join(projectRoot, ".claude/canvas/components"),
      source: "project" as const,
    })
  }
}

/**
 * Check if a directory exists
 */
async function dirExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Compile JSX source code to JavaScript
 */
function compileJSX(sourceCode: string, componentName: string): string {
  try {
    const result = transform(sourceCode, {
      transforms: ["jsx"],
      jsxRuntime: "classic",
      production: true,
    })
    return result.code
  } catch (error) {
    console.error(`Failed to compile component ${componentName}:`, error)
    // Return a stub that shows the error
    return `function ${componentName}() { return React.createElement("div", {className: "p-4 bg-red-100 text-red-800"}, "Component ${componentName} failed to compile"); }`
  }
}

/**
 * Load a single component from a file
 */
async function loadComponent(filePath: string, source: ComponentDir["source"]): Promise<ComponentInfo | null> {
  try {
    const sourceCode = await readFile(filePath, "utf-8")
    const fileName = basename(filePath)
    const name = fileName.replace(/\.jsx$/, "")

    // Compile JSX to JS
    const compiledCode = compileJSX(sourceCode, name)

    return {
      name,
      sourceCode,
      compiledCode,
      source,
      path: filePath,
    }
  } catch (error) {
    console.error(`Failed to load component from ${filePath}:`, error)
    return null
  }
}

/**
 * Scan a directory for component files
 */
async function scanComponentDir(dir: ComponentDir): Promise<ComponentInfo[]> {
  if (!(await dirExists(dir.path))) {
    return []
  }

  try {
    const files = await readdir(dir.path)
    const jsxFiles = files.filter((f) => f.endsWith(".jsx"))

    const loaded: ComponentInfo[] = []
    for (const file of jsxFiles) {
      const component = await loadComponent(join(dir.path, file), dir.source)
      if (component) {
        loaded.push(component)
      }
    }

    return loaded
  } catch (error) {
    console.error(`Failed to scan component directory ${dir.path}:`, error)
    return []
  }
}

/**
 * Load all components from all directories
 * Later directories override earlier ones (project > global > skill)
 */
export async function loadComponents(): Promise<void> {
  components.clear()

  for (const dir of componentDirs) {
    const dirComponents = await scanComponentDir(dir)
    for (const component of dirComponents) {
      // Later sources override earlier ones
      components.set(component.name, component)
    }
  }

  const count = components.size
  if (count > 0) {
    const sources = [...new Set([...components.values()].map((c) => c.source))]
    console.log(`Loaded ${count} component(s) from: ${sources.join(", ")}`)
  }
}

/**
 * Get all loaded components
 */
export function getComponents(): Map<string, ComponentInfo> {
  return components
}

/**
 * Get compiled components as a record for sending to browser
 * Returns { ComponentName: "compiled JS code", ... }
 */
export function getCompiledComponents(): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [name, info] of components) {
    result[name] = info.compiledCode
  }
  return result
}

/**
 * Check if any components are loaded
 */
export function hasComponents(): boolean {
  return components.size > 0
}

/**
 * No longer prepending - components are sent separately via WebSocket
 * This function now just returns the code unchanged
 */
export function prependComponents(appCode: string): string {
  return appCode
}

/**
 * Start watching component directories for changes
 */
export function watchComponents(onChange: () => void): FSWatcher | null {
  onChangeCallback = onChange

  // Get existing directories to watch
  const existingDirs = componentDirs
    .map((d) => d.path)
    .filter((p) => {
      try {
        require("fs").accessSync(p)
        return true
      } catch {
        return false
      }
    })

  if (existingDirs.length === 0) {
    console.log("No component directories found to watch")
    return null
  }

  componentWatcher = chokidar.watch(existingDirs, {
    persistent: true,
    ignoreInitial: true,
    depth: 0, // Only watch immediate children
    awaitWriteFinish: {
      stabilityThreshold: 50,
      pollInterval: 10,
    },
  })

  componentWatcher.on("add", async (filePath) => {
    if (!filePath.endsWith(".jsx")) return
    console.log(`Component added: ${basename(filePath)}`)
    await loadComponents()
    onChangeCallback?.()
  })

  componentWatcher.on("change", async (filePath) => {
    if (!filePath.endsWith(".jsx")) return
    console.log(`Component changed: ${basename(filePath)}`)
    await loadComponents()
    onChangeCallback?.()
  })

  componentWatcher.on("unlink", async (filePath) => {
    if (!filePath.endsWith(".jsx")) return
    console.log(`Component removed: ${basename(filePath)}`)
    await loadComponents()
    onChangeCallback?.()
  })

  console.log(`Watching ${existingDirs.length} component directory(s)`)
  return componentWatcher
}

/**
 * Stop watching component directories
 */
export async function stopWatchingComponents(): Promise<void> {
  if (componentWatcher) {
    await componentWatcher.close()
    componentWatcher = null
  }
  onChangeCallback = null
}

/**
 * Get list of identifiers available in the browser scope
 * Used by server-side validators to check for undefined references
 */
export function getScopeIdentifiers(): string[] {
  // Core React
  const reactIdentifiers = [
    "React", "useState", "useEffect", "useCallback", "useMemo", "useRef", "useReducer"
  ]

  // shadcn/ui components
  const shadcnIdentifiers = [
    "Button", "Card", "CardHeader", "CardTitle", "CardDescription", "CardContent", "CardFooter",
    "Input", "Textarea", "Label",
    "Table", "TableHeader", "TableBody", "TableFooter", "TableHead", "TableRow", "TableCell", "TableCaption",
    "Dialog", "DialogPortal", "DialogOverlay", "DialogClose", "DialogTrigger", "DialogContent",
    "DialogHeader", "DialogFooter", "DialogTitle", "DialogDescription",
    "Sheet", "SheetPortal", "SheetOverlay", "SheetTrigger", "SheetClose", "SheetContent",
    "SheetHeader", "SheetFooter", "SheetTitle", "SheetDescription",
    "Tabs", "TabsList", "TabsTrigger", "TabsContent",
    "Accordion", "AccordionItem", "AccordionTrigger", "AccordionContent",
    "Select", "SelectGroup", "SelectValue", "SelectTrigger", "SelectContent",
    "SelectLabel", "SelectItem", "SelectSeparator",
    "Checkbox", "RadioGroup", "RadioGroupItem", "Switch", "Slider",
    "Badge", "Avatar", "AvatarImage", "AvatarFallback",
    "Progress", "Skeleton",
    "Alert", "AlertTitle", "AlertDescription",
    "Tooltip", "TooltipTrigger", "TooltipContent", "TooltipProvider"
  ]

  // Recharts
  const rechartsIdentifiers = [
    "LineChart", "Line", "BarChart", "Bar", "PieChart", "Pie", "AreaChart", "Area",
    "RadarChart", "Radar", "RadialBarChart", "RadialBar", "ScatterChart", "Scatter", "ComposedChart",
    "XAxis", "YAxis", "CartesianGrid", "RechartsTooltip", "Legend", "ResponsiveContainer", "Cell",
    "PolarGrid", "PolarAngleAxis", "PolarRadiusAxis", "Brush", "ReferenceLine", "ReferenceArea",
    "ReferenceDot", "ErrorBar", "LabelList"
  ]

  // Utilities and markdown
  const utilIdentifiers = ["cn", "format", "canvasEmit", "useCanvasState", "Markdown", "remarkGfm"]

  // Lucide icons - dynamically extract from the package to stay in sync with scope.ts
  let lucideIdentifiers: string[] = []
  try {
    const conflicting = new Set([
      "Table", "LineChart", "BarChart", "PieChart", "AreaChart", "Radar",
      "ScatterChart", "Brush", "default", "createLucideIcon", "icons"
    ])
    const lucide = require("lucide-react")
    lucideIdentifiers = Object.keys(lucide).filter(
      (key: string) => !conflicting.has(key) && lucide[key] != null && (
        typeof lucide[key] === "function" ||
        (typeof lucide[key] === "object" && lucide[key].$$typeof != null)
      )
    )
  } catch {
    // Lucide not available server-side; skip
  }

  // Dynamic components from skill directories
  const dynamicComponents = Array.from(components.keys())

  return [
    ...reactIdentifiers,
    ...shadcnIdentifiers,
    ...rechartsIdentifiers,
    ...utilIdentifiers,
    ...lucideIdentifiers,
    ...dynamicComponents
  ]
}
