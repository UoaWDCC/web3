import { z } from "zod";

export enum UniversityType {
  UOA = "UOA",
  AUT = "AUT",
  Other = "OTHER",
  None = "NONE",
}

export enum DegreeType {
  FirstYear = "FIRST_YEAR",
  SecondYear = "SECOND_YEAR",
  ThirdYear = "THIRD_YEAR",
  FourthYear = "FOURTH_YEAR",
  FourthYearAndBeyond = "FOURTH_ABOVE",
  Masters = "MASTER",
  PhD = "PHD",
}

export enum FacultyType {
  Arts = "ARTS",
  Commerce = "COMMERCE",
  Engineering = "ENGINEERING",
  Science = "SCIENCE",
  Other = "OTHER",
}

// Keep this as a single object schema so empty selects produce friendly
// validation messages, while superRefine handles the university-specific rules.
const RegistrationSchema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required"),
    last_name: z.string().trim().min(1, "Last name is required"),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Email must be valid"),
    university: z.nativeEnum(UniversityType, "Select University"),
    university_other: z.string().trim().nullable().optional(),
    upi: z.string().trim().nullable().optional(),
    student_id: z.string().trim().nullable().optional(),
    degree_type: z.nativeEnum(DegreeType).nullable().optional(),
    faculty: z.nativeEnum(FacultyType).nullable().optional(),
    goal_statement: z.string().trim().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // None is a valid option, but other fields should not be present, skip the rest
    if (data.university === UniversityType.None) {
      return;
    }

    // Other is a valid option, but university_other is required
    if (data.university === UniversityType.Other && !data.university_other) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["university_other"],
        message: "University's name is required",
      });
    }

    // UOA and AUT require upi and student_id, respectively
    if (data.university === UniversityType.UOA && !data.upi) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["upi"],
        message: "UPI is required",
      });
    }

    if (
      data.university === UniversityType.UOA ||
      data.university === UniversityType.AUT
    ) {
      if (!data.student_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["student_id"],
          message: "Student ID is required",
        });
      } else if (!/^\d+$/.test(data.student_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["student_id"],
          message: "Student ID must contain only numbers",
        });
      }
    }

    // Degree type and faculty are required ( skipped None already )
    if (!data.degree_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["degree_type"],
        message: "Degree type is required",
      });
    }

    if (!data.faculty) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["faculty"],
        message: "Faculty is required",
      });
    }
  });

export type RegistrationData = z.infer<typeof RegistrationSchema>;
export { RegistrationSchema };
