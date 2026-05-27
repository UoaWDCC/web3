"use client";

import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  RegistrationSchema,
  RegistrationData,
} from "../lib/schemas/registration";
import {
  UniversityType,
  DegreeType,
  FacultyType,
} from "../lib/schemas/registration";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormInput, FormSelect } from "./ui/form-field";
import { RegistrationService } from "../services/registrations/registrations-service";

/**
 * Renders a registration form for new members to join the team.
 * This form handles user input for personal details, university information,
 * and a goal statement. It integrates with `react-hook-form` for validation
 * and form state management, and interacts with `RegistrationService` to
 * check email availability and submit registration data.
 *
 * @returns {JSX.Element} The registration form component.
 */
export function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    clearErrors,
  } = useForm<RegistrationData>({
    resolver: zodResolver(RegistrationSchema),
  });

  const selectedUniversity = watch("university");

  useEffect(() => {
    const clearField = (
      field:
        | "university_other"
        | "upi"
        | "student_id"
        | "degree_type"
        | "faculty",
    ) => {
      clearErrors(field);
      setValue(field, null as never, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
    };

    if (!selectedUniversity) {
      return;
    }

    if (selectedUniversity === UniversityType.None) {
      clearField("university_other");
      clearField("upi");
      clearField("student_id");
      clearField("degree_type");
      clearField("faculty");
      return;
    }

    if (selectedUniversity === UniversityType.UOA) {
      clearField("university_other");
      return;
    }

    if (selectedUniversity === UniversityType.AUT) {
      clearField("university_other");
      clearField("upi");
      return;
    }

    if (selectedUniversity === UniversityType.Other) {
      clearField("upi");
      clearField("student_id");
    }
  }, [clearErrors, selectedUniversity, setValue]);

  /**
   * Handles the form submission.
   * Validates the form data, checks if the email is already taken,
   * submits the registration data, and resets the form.
   *
   * @param {RegistrationData} data - The validated form data.
   */
  const onSubmit: SubmitHandler<RegistrationData> = async (data) => {
    console.log("Submitting", data);

    const emailTaken = await RegistrationService.isEmailTaken(data.email);
    if (emailTaken) {
      alert("Email is already taken");
      return;
    }

    await RegistrationService.submitRegistration(data);

    reset();
    alert("Form submitted successfully!");
  };

  // Storing the shared styles in a variable keeps the JSX clean!
  const inputClass =
    "w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-lg bg-white p-8 rounded-xl shadow-xl/20 flex flex-col gap-4"
        noValidate
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Join Our Team
        </h2>

        <FormInput
          className={inputClass}
          placeholder="First Name"
          error={errors.first_name}
          registerProps={register("first_name")}
        />
        <FormInput
          className={inputClass}
          placeholder="Last Name"
          error={errors.last_name}
          registerProps={register("last_name")}
        />
        <FormInput
          type="email"
          className={inputClass}
          placeholder="Email"
          error={errors.email}
          registerProps={register("email")}
        />

        <FormSelect
          className={inputClass}
          defaultValue=""
          error={errors.university}
          registerProps={register("university")}
        >
          <option value="" disabled>
            Select University
          </option>
          <option value={UniversityType.UOA}>UOA</option>
          <option value={UniversityType.AUT}>AUT</option>
          <option value={UniversityType.Other}>Other</option>
          <option value={UniversityType.None}>None</option>
        </FormSelect>

        {selectedUniversity && selectedUniversity !== UniversityType.None && (
          <div className="flex flex-col gap-4">
            {selectedUniversity &&
              selectedUniversity !== UniversityType.Other && (
                <div className="flex flex-row gap-4">
                  {selectedUniversity &&
                    selectedUniversity !== UniversityType.AUT && (
                      <div className="flex-1">
                        <FormInput
                          className={inputClass}
                          placeholder="UPI"
                          error={errors.upi}
                          registerProps={register("upi")}
                        />
                      </div>
                    )}

                  <div className="flex-1">
                    <FormInput
                      type="text"
                      className={inputClass}
                      numericOnly={true}
                      placeholder="Student ID"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      error={errors.student_id}
                      registerProps={register("student_id")}
                    />
                  </div>
                </div>
              )}

            {selectedUniversity &&
              selectedUniversity === UniversityType.Other && (
                <div className="flex-1">
                  <FormInput
                    type="text"
                    className={inputClass}
                    placeholder="Other University"
                    error={errors.university_other}
                    registerProps={register("university_other")}
                  />
                </div>
              )}

            <FormSelect
              className={inputClass}
              defaultValue=""
              error={errors.degree_type}
              registerProps={register("degree_type", {
                setValueAs: (value) => (value === "" ? null : value),
              })}
            >
              <option value="" disabled>
                Select Degree Type
              </option>
              <option value={DegreeType.FirstYear}>First Year</option>
              <option value={DegreeType.SecondYear}>Second Year</option>
              <option value={DegreeType.ThirdYear}>Third Year</option>
              <option value={DegreeType.FourthYear}>Fourth Year</option>
              <option value={DegreeType.FourthYearAndBeyond}>
                Fourth Year and Beyond
              </option>
              <option value={DegreeType.Masters}>Masters</option>
              <option value={DegreeType.PhD}>PhD</option>
            </FormSelect>

            <FormSelect
              className={inputClass}
              defaultValue=""
              error={errors.faculty}
              registerProps={register("faculty", {
                setValueAs: (value) => (value === "" ? null : value),
              })}
            >
              <option value="" disabled>
                Select Faculty
              </option>
              <option value={FacultyType.Science}>Science</option>
              <option value={FacultyType.Arts}>Arts</option>
              <option value={FacultyType.Engineering}>Engineering</option>
              <option value={FacultyType.Commerce}>Commerce</option>
              <option value={FacultyType.Other}>Other</option>
            </FormSelect>
          </div>
        )}

        <textarea
          className={inputClass}
          placeholder="Goal Statement"
          {...register("goal_statement")}
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-4 shadow-sm"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
