import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/context/ToastContext";
import Login from "@/pages/auth/Login";

describe("Login page", () => {
  it("shows validation errors when submitting empty form", async () => {
    render(
      <ToastProvider>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </ToastProvider>
    );

    const submit = screen.getByRole("button", { name: /log in/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });
});
