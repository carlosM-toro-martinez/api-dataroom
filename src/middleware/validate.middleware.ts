import type { Request, Response, NextFunction } from "express";
import type { ZodIssue, ZodTypeAny } from "zod";

const fieldLabels: Record<string, string> = {
  email: "Correo",
  password: "Contrasena",
  nombre: "Nombre",
  code: "Código",
  name: "Nombre",
  abbreviation: "Abreviatura",
  category: "Categoría",
  priority: "Prioridad",
  sampledAt: "Fecha de muestreo",
  sentAt: "Fecha de envío",
  projectName: "Proyecto",
  notes: "Notas",
  interiorLaboratoryId: "Laboratorio",
  surfaceLaboratoryId: "Laboratorio",
  laboratoryId: "Laboratorio",
  interiorSampleId: "Muestra",
  surfaceSampleId: "Muestra",
  sampleId: "Muestra",
  elementId: "Elemento",
  elementIds: "Elementos solicitados",
  items: "Muestras del lote",
};

function pathToText(path: ZodIssue["path"]) {
  if (path.length === 0) return "Solicitud";
  const lastString = [...path].reverse().find((part): part is string => typeof part === "string");
  if (lastString && fieldLabels[lastString]) return fieldLabels[lastString];
  return path
    .map((part) => {
      if (typeof part === "number") return `#${part + 1}`;
      if (typeof part === "string") return fieldLabels[part] ?? part;
      return String(part);
    })
    .join(" > ");
}

function issueMessage(issue: ZodIssue) {
  const field = pathToText(issue.path);
  const code = issue.code;
  const rawMessage = issue.message;

  if (rawMessage === "At least one element required") {
    return `${field}: selecciona al menos un elemento para analizar.`;
  }
  if (rawMessage === "At least one sample required") {
    return `${field}: selecciona al menos una muestra para el lote.`;
  }

  if (code === "invalid_format" && rawMessage.toLowerCase().includes("uuid")) {
    return `${field}: el identificador no es valido o aun no esta sincronizado. Vuelve a sincronizar catalogos y selecciona el dato nuevamente.`;
  }
  if (code === "invalid_format" && rawMessage.toLowerCase().includes("datetime")) {
    return `${field}: la fecha no tiene un formato valido.`;
  }
  if (code === "invalid_type") {
    return `${field}: dato requerido o con tipo incorrecto.`;
  }
  if (code === "too_small") {
    return `${field}: falta informacion obligatoria.`;
  }
  if (code === "invalid_value") {
    return `${field}: valor no permitido.`;
  }
  if (code === "unrecognized_keys") {
    const keys = (issue as any).keys;
    return `Solicitud: contiene campos no permitidos${Array.isArray(keys) ? ` (${keys.join(", ")})` : ""}.`;
  }

  return `${field}: ${rawMessage}`;
}

function formatValidationIssues(issues: ZodIssue[]) {
  const formatted = issues.map((issue) => ({
    path: issue.path.join("."),
    field: pathToText(issue.path),
    message: issueMessage(issue),
    code: issue.code,
  }));

  const message =
    formatted[0]?.message ??
    "La solicitud tiene datos incompletos o invalidos. Revisa los campos e intenta nuevamente.";

  return { message, formatted };
}

export const validate =
  (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const { message, formatted } = formatValidationIssues(result.error.issues);
      return res.status(400).json({
        success: false,
        error: message,
        message,
        code: "VALIDATION_ERROR",
        details: {
          issues: formatted,
          fields: result.error.flatten().fieldErrors,
          form: result.error.flatten().formErrors,
        },
      });
    }

    req.body = result.data;
    next();
  };
