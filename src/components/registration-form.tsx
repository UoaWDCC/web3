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
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormInput, FormSelect } from "./ui/form-field";
import { Button } from "./ui/button";
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
    setError
  } = useForm<RegistrationData>({
    resolver: zodResolver(RegistrationSchema),
  });

  const selectedUniversity = watch("university");
  const [finishedForm, setFinishedForm] = useState(false);

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
      setError("email", {
        type: "custom",
        message: "This email is already registered"
      })
      return;
    }

    await RegistrationService.submitRegistration(data);

    reset();
    setFinishedForm(true);
  };

  return (
    <div className="mx-auto w-full rounded-[36px] bg-form p-8 md:p-12 shadow-xl/20">
      {finishedForm && (
        <div className="flex flex-col items-center gap-4 p-12 md:gap-8 md:p-36">
          <img
            src="/logo/confirm_icon.svg"
            alt="Confirmation Icon"
            width="200px"
            height="200px"
          />
          <p className="text-white text-xl md:text-3xl font-bold text-center">
            Welcome, you've joined Web3!
          </p>
        </div>
      )}
      {!finishedForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mx-auto w-full flex flex-col items-center gap-5"
          noValidate
        >
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold leading-tight mb-4 text-hero-text">
            Join Our Team
          </h2>

          <FormInput
            placeholder="First Name"
            error={errors.first_name}
            registerProps={register("first_name")}
          />

          <FormInput
            placeholder="Last Name"
            error={errors.last_name}
            registerProps={register("last_name")}
          />

          <FormInput
            type="email"
            placeholder="Email"
            error={errors.email}
            registerProps={register("email")}
          />

          <FormSelect
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
            <>
              {selectedUniversity &&
                selectedUniversity !== UniversityType.Other && (
                  <div className="flex gap-3 w-full max-w-[680px]">
                    {selectedUniversity &&
                      selectedUniversity !== UniversityType.AUT && (
                        <FormInput
                          placeholder="UPI"
                          error={errors.upi}
                          registerProps={register("upi")}
                        />
                      )}

                    <FormInput
                      type="text"
                      numericOnly={true}
                      placeholder="Student ID"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      error={errors.student_id}
                      registerProps={register("student_id")}
                    />
                  </div>
                )}

              {selectedUniversity &&
                selectedUniversity === UniversityType.Other && (
                  <FormInput
                    type="text"
                    placeholder="Other University"
                    error={errors.university_other}
                    registerProps={register("university_other")}
                  />
                )}

              <FormSelect
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
            </>
          )}

          <textarea
            className="w-full max-w-[680px] rounded-xl px-5 sm:px-8 py-5 
            bg-white/60 focus:bg-white/90 transition-colors
            md:text-[1.5rem] text-[1rem] leading-none shadow-xl outline-none"
            placeholder="Goal Statement"
            {...register("goal_statement")}
          />

          <Button
            type="submit"
            variant="pill"
            size="lg"
            className="text-base px-13 h-12 rounded-2xl mt-5"
          >
            Submit
          </Button>
        </form>
      )}
    </div>
  );
}
