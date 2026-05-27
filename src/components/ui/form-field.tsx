// Mock UI components for temporary use
import { UseFormRegisterReturn, FieldError } from "react-hook-form";

const baseInputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Props provided by `react-hook-form`'s `register` function.
   * Includes `onChange`, `onBlur`, `name`, and `ref`.
   */
  registerProps: UseFormRegisterReturn;
  /**
   * An error object from `react-hook-form` to display validation messages.
   */
  error?: FieldError;
  /**
   * If true, the input will only allow numeric characters (0-9).
   * It sets `type="text"`, `inputMode="numeric"`, `pattern="[0-9]*"`,
   * and filters non-numeric input on `onChange`.
   */
  numericOnly?: boolean;
}

/**
 * A styled input component integrated with `react-hook-form`.
 * It provides basic styling, error display, and optional numeric-only input filtering.
 *
 * @param {FormInputProps} props - The props for the FormInput component.
 * @returns {JSX.Element} A div containing the input and an optional error message.
 */
export function FormInput({
  registerProps,
  error,
  numericOnly,
  ...props
}: FormInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (numericOnly) {
      e.target.value = e.target.value.replace(/\D/g, "");
    }
    if (registerProps?.onChange) {
      registerProps.onChange(e);
    }
  };

  return (
    <div>
      <input
        className={baseInputClass}
        {...props}
        {...registerProps}
        onChange={handleChange}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
    </div>
  );
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Props provided by `react-hook-form`'s `register` function.
   * Includes `onChange`, `onBlur`, `name`, and `ref`.
   */
  registerProps: UseFormRegisterReturn;
  /**
   * An error object from `react-hook-form` to display validation messages.
   */
  error?: FieldError;
  /**
   * The child `<option>` elements for the select dropdown.
   */
  children: React.ReactNode;
}

/**
 * A styled select dropdown component integrated with `react-hook-form`.
 * It provides basic styling, error display, and renders its children as options.
 *
 * @param {FormSelectProps} props - The props for the FormSelect component.
 * @returns {JSX.Element} A div containing the select element and an optional error message.
 */
export function FormSelect({
  registerProps,
  error,
  children,
  ...props
}: FormSelectProps) {
  return (
    <div>
      <select className={baseInputClass} {...props} {...registerProps}>
        {children}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
    </div>
  );
}
