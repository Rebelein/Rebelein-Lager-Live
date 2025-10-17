
"use client"
import { useToast as useToastInternal, toast } from "./use-toast-internal"
import { Toaster } from "@/components/ui/toaster"

export const useToast = useToastInternal
export { toast, Toaster }
