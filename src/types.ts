import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'company' | 'admin';
}

export interface Internship {
  id: number;
  company_id: number;
  company_name: string;
  role: string;
  required_skills: string; // JSON string
  seats: number;
  duration: string;
  description: string;
}

export interface Application {
  id: number;
  student_id: number;
  internship_id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'allocated';
  match_score: number;
  success_probability: number;
  role?: string;
  company_name?: string;
  student_name?: string;
  cgpa?: number;
  skills?: string;
}

export interface Allocation {
  id: number;
  student_id: number;
  internship_id: number;
  student_name: string;
  company_name: string;
  role: string;
  score: number;
  success_probability: number;
  allocated_at: string;
}
