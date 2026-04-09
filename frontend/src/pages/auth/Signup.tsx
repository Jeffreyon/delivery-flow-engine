import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { setAuthToken } from "@/lib/authToken";
import { signup } from "@/services/auth.api";
import { provisionSelfNetwork } from "@/services/network.api";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { useToast } from "@/hooks/useToast";

type SignupFormValues = {
  displayName: string;
  tenantName: string;
  phoneNumber: string;
  email: string;
  password: string;
};

export default function Signup() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>();
  const [loading, setLoading] = useState(false);
  const { success, error: showErrorToast } = useToast();

  async function onSubmit(values: SignupFormValues) {
    setLoading(true);
    let accountCreated = false;

    try {
      const res = await signup({
        email: values.email,
        password: values.password,
        profile: {
          displayName: values.displayName,
        },
      });
      if (res.idToken) {
        setAuthToken(res.idToken);
      }
      accountCreated = true;
      await provisionSelfNetwork({
        tenantName: values.tenantName,
        phoneNumber: values.phoneNumber,
      });
      success(
        "Your account and network workspace have been created.",
        "Account created"
      );
    } catch (err) {
      console.error(err);
      if (accountCreated) {
        showErrorToast(
          "Your account was created, but network provisioning failed. Sign in and retry after support confirms the network bridge is healthy.",
          "Provisioning failed"
        );
      } else {
        showErrorToast(
          "Sign up failed. Please try again.",
          "Sign up failed"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Start with a minimal, production-ready scaffold."
      footer={
        <span>
          By signing up, you agree to our{" "}
          <a href="#" className="underline underline-offset-2">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </span>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="displayName">
            Full name
          </label>
          <input
            id="displayName"
            type="text"
            {...register("displayName", { required: "Full name is required" })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {errors.displayName && (
            <p className="text-xs text-destructive" role="alert">
              {errors.displayName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="tenantName">
            Workspace name
          </label>
          <input
            id="tenantName"
            type="text"
            {...register("tenantName", {
              required: "Workspace name is required",
            })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {errors.tenantName && (
            <p className="text-xs text-destructive" role="alert">
              {errors.tenantName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="phoneNumber">
            Node phone number
          </label>
          <input
            id="phoneNumber"
            type="tel"
            placeholder="+2348012345678"
            {...register("phoneNumber", {
              required: "Node phone number is required",
            })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {errors.phoneNumber && (
            <p className="text-xs text-destructive" role="alert">
              {errors.phoneNumber.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register("email", { required: "Email is required" })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {errors.email && (
            <p className="text-xs text-destructive" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            {...register("password", { required: "Password is required" })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {errors.password && (
            <p className="text-xs text-destructive" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
        <p className="text-xs text-center text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/auth/login"
            className="font-medium text-primary hover:underline"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
