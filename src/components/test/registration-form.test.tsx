// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RegistrationForm } from "../registration-form";
import { RegistrationService } from "../../services/registrations/registrations-service";

vi.mock("../../services/registrations/registrations-service", () => ({
  RegistrationService: {
    isEmailTaken: vi.fn(),
    submitRegistration: vi.fn(),
  },
}));

const mockedRegistrationService = vi.mocked(RegistrationService);

function renderForm() {
  return render(<RegistrationForm />);
}

function getUniversitySelect() {
  const [universitySelect] = screen.getAllByRole("combobox");

  if (!universitySelect) {
    throw new Error("University select was not rendered");
  }

  return universitySelect;
}

function getConditionalComboboxes() {
  const [, degreeSelect, facultySelect] = screen.getAllByRole("combobox");

  if (!degreeSelect || !facultySelect) {
    throw new Error("Expected degree and faculty selects to be rendered");
  }

  return { degreeSelect, facultySelect };
}

async function selectUniversity(
  user: ReturnType<typeof userEvent.setup>,
  value: "UOA" | "AUT" | "OTHER" | "NONE",
) {
  await user.selectOptions(getUniversitySelect(), value);
}

describe("RegistrationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the title and base fields", () => {
    renderForm();

    expect(
      screen.getByRole("heading", { name: /join our team/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/goal statement/i)).toBeInTheDocument();
    expect(getUniversitySelect()).toBeInTheDocument();
  });

  it("shows UPI, Student ID, Degree Type, and Faculty when UOA is selected", async () => {
    const user = userEvent.setup();
    renderForm();

    await selectUniversity(user, "UOA");

    expect(await screen.findByPlaceholderText(/upi/i)).toBeInTheDocument();
    expect(await screen.findByPlaceholderText(/student id/i)).toBeInTheDocument();
    expect(screen.getByText(/select degree type/i)).toBeInTheDocument();
    expect(screen.getByText(/select faculty/i)).toBeInTheDocument();
  });

  it("shows only Student ID for AUT", async () => {
    const user = userEvent.setup();
    renderForm();

    await selectUniversity(user, "AUT");

    expect(screen.queryByPlaceholderText(/upi/i)).not.toBeInTheDocument();
    expect(await screen.findByPlaceholderText(/student id/i)).toBeInTheDocument();
    expect(screen.getByText(/select degree type/i)).toBeInTheDocument();
    expect(screen.getByText(/select faculty/i)).toBeInTheDocument();
  });

  it("shows Other University and hides UPI and Student ID for Other", async () => {
    const user = userEvent.setup();
    renderForm();

    await selectUniversity(user, "OTHER");

    expect(
      await screen.findByPlaceholderText(/other university/i),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/upi/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/student id/i)).not.toBeInTheDocument();
    expect(screen.getByText(/select degree type/i)).toBeInTheDocument();
    expect(screen.getByText(/select faculty/i)).toBeInTheDocument();
  });

  it("hides all conditional university fields when None is selected", async () => {
    const user = userEvent.setup();
    renderForm();

    await selectUniversity(user, "NONE");

    expect(screen.queryByPlaceholderText(/upi/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/student id/i)).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/other university/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/select degree type/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/select faculty/i)).not.toBeInTheDocument();
  });

  it("filters non-digits from the Student ID field", async () => {
    const user = userEvent.setup();
    renderForm();

    await selectUniversity(user, "UOA");

    const studentId = (await screen.findByPlaceholderText(
      /student id/i,
    )) as HTMLInputElement;

    await user.type(studentId, "12ab34!@#");

    expect(studentId.value).toBe("1234");
  });

  it("requires the university-specific fields when UOA is selected", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByPlaceholderText(/first name/i), "Ada");
    await user.type(screen.getByPlaceholderText(/last name/i), "Lovelace");
    await user.type(screen.getByPlaceholderText(/email/i), "ada@example.com");
    await selectUniversity(user, "UOA");

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(mockedRegistrationService.isEmailTaken).not.toHaveBeenCalled();
    expect(mockedRegistrationService.submitRegistration).not.toHaveBeenCalled();
    expect(screen.getByText(/UPI is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Student ID is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Degree type is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Faculty is required/i)).toBeInTheDocument();
  });

  it("clears fields that disappear when switching from UOA to NONE", async () => {
    const user = userEvent.setup();
    mockedRegistrationService.isEmailTaken.mockResolvedValue(false);
    mockedRegistrationService.submitRegistration.mockResolvedValue(undefined);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    renderForm();

    await user.type(screen.getByPlaceholderText(/first name/i), "Ada");
    await user.type(screen.getByPlaceholderText(/last name/i), "Lovelace");
    await user.type(screen.getByPlaceholderText(/email/i), "ada@example.com");
    await selectUniversity(user, "UOA");

    await user.type(screen.getByPlaceholderText(/upi/i), "1234567");
    await user.type(screen.getByPlaceholderText(/student id/i), "987654");

    const { degreeSelect, facultySelect } = getConditionalComboboxes();
    await user.selectOptions(degreeSelect, "FIRST_YEAR");
    await user.selectOptions(facultySelect, "SCIENCE");

    await selectUniversity(user, "NONE");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(mockedRegistrationService.isEmailTaken).toHaveBeenCalledWith(
      "ada@example.com",
    );
    expect(mockedRegistrationService.submitRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        university: "NONE",
        upi: null,
        student_id: null,
        degree_type: null,
        faculty: null,
        university_other: null,
      }),
    );
    expect(alertSpy).toHaveBeenCalledWith("Form submitted successfully!");
  });

  it("stops submission when the email is already taken", async () => {
    const user = userEvent.setup();
    mockedRegistrationService.isEmailTaken.mockResolvedValue(true);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    renderForm();

    await user.type(screen.getByPlaceholderText(/first name/i), "Ada");
    await user.type(screen.getByPlaceholderText(/last name/i), "Lovelace");
    await user.type(screen.getByPlaceholderText(/email/i), "taken@example.com");
    await selectUniversity(user, "NONE");

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(mockedRegistrationService.isEmailTaken).toHaveBeenCalledWith(
      "taken@example.com",
    );
    expect(mockedRegistrationService.submitRegistration).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith("Email is already taken");
  });

  it("submits successfully when the email is available", async () => {
    const user = userEvent.setup();
    mockedRegistrationService.isEmailTaken.mockResolvedValue(false);
    mockedRegistrationService.submitRegistration.mockResolvedValue(undefined);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    renderForm();

    await user.type(screen.getByPlaceholderText(/first name/i), "Ada");
    await user.type(screen.getByPlaceholderText(/last name/i), "Lovelace");
    await user.type(screen.getByPlaceholderText(/email/i), "ok@example.com");
    await selectUniversity(user, "NONE");

    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(mockedRegistrationService.isEmailTaken).toHaveBeenCalledWith(
      "ok@example.com",
    );
    expect(mockedRegistrationService.submitRegistration).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith("Form submitted successfully!");
  });
});
