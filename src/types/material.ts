export type MaterialFileType = "PDF" | "DOC" | "IMG" | "VID";

export interface Material {
  id:          string;
  user_id:     string;
  title:       string;
  description: string;
  subject:     string;
  price:       number;
  file_url:    string | null;
  file_type:   MaterialFileType | null;
  file_size:   string | null;
  is_visible:  boolean;
  created_at:  string;
  author?:     string;
}

export const SUBJECTS = [
  "Cálculo Diferencial",
  "Cálculo Integral",
  "Álgebra Lineal",
  "Ecuaciones Diferenciales",
  "Física I",
  "Física II",
  "Química General",
  "Estadística",
  "Probabilidad",
  "Termodinámica",
  "Mecánica de Fluidos",
  "Resistencia de Materiales",
  "Programación",
  "Estructuras de Datos",
  "Bases de Datos",
  "Biología General",
  "Historia del Arte",
  "Otra",
] as const;

export type Subject = typeof SUBJECTS[number];

export const FILE_TYPE_THUMB: Record<string, string> = {
  PDF: "thumb-pdf",
  DOC: "thumb-doc",
  IMG: "thumb-img",
  VID: "thumb-vid",
};