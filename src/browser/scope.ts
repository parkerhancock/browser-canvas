import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useReducer
} from "react"

// shadcn/ui components
import { Button } from "./components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "./components/ui/card"
import { Input } from "./components/ui/input"
import { Textarea } from "./components/ui/textarea"
import { Label } from "./components/ui/label"
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption
} from "./components/ui/table"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from "./components/ui/dialog"
import {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription
} from "./components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from "./components/ui/accordion"
import {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator
} from "./components/ui/select"
import { Checkbox } from "./components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group"
import { Switch } from "./components/ui/switch"
import { Slider } from "./components/ui/slider"
import { Badge } from "./components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar"
import { Progress } from "./components/ui/progress"
import { Skeleton } from "./components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from "./components/ui/tooltip"

// Recharts components
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  RadialBarChart,
  RadialBar,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Brush,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  ErrorBar,
  LabelList
} from "recharts"

// Lucide icons - import all and filter out conflicts
import * as AllLucideIcons from "lucide-react"

// Utilities
import { cn } from "./lib/utils"
import { format } from "date-fns"

// Markdown rendering
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

// State hook for two-way agent communication
import { useCanvasState } from "./use-canvas-state"

// Names that conflict with Recharts or other exports
const conflictingNames = new Set([
  "Table",
  "LineChart",
  "BarChart",
  "PieChart",
  "AreaChart",
  "Radar",
  "ScatterChart",
  "Brush",
  // Common React/utility conflicts
  "default",
  "createLucideIcon",
  "icons"
])

// Filter Lucide icons to avoid conflicts with Recharts components
// Icons are forwardRef objects (typeof "object" with $$typeof), not plain functions
const LucideIcons = Object.fromEntries(
  Object.entries(AllLucideIcons).filter(
    ([key, val]) => !conflictingNames.has(key) && val != null && (
      typeof val === "function" ||
      (typeof val === "object" && (val as any).$$typeof != null)
    )
  )
)

// Create the scope object with all exports available to react-runner
export const scope = {
  // React core
  React,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useReducer,

  // shadcn/ui components
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Textarea,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Switch,
  Slider,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Progress,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,

  // Recharts
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  RadialBarChart,
  RadialBar,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Brush,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  ErrorBar,
  LabelList,

  // Utilities
  cn,
  format,

  // Markdown
  Markdown,
  remarkGfm,

  // Event emitter (will be available via window.canvasEmit)
  canvasEmit: (event: string, data: unknown) => {
    if (typeof window !== "undefined" && window.canvasEmit) {
      window.canvasEmit(event, data)
    }
  },

  // State hook for two-way agent communication
  useCanvasState,

  // Spread all Lucide icons into scope (conflicts filtered out)
  ...LucideIcons
}

export type Scope = typeof scope
