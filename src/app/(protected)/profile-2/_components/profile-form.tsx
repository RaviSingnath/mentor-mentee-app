"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveProfileAction } from "@/features/profile/profile.actions";
import { EXPERIENCE_OPTIONS, TIMEZONES, timezoneLabel } from "@/features/profile/profile.constants";
import { profileCompleteness, zProfile, type TProfile, type TProfileInput } from "@/features/profile/profile.schema";
import handleFormSubmit from "@/lib/helper/handle-RHF-submit";
import { appToast } from "@/lib/helper/toast";
import { AvailabilityEditor } from "@/components/profile-2/availability-editor";
import { LanguagePicker } from "@/components/profile-2/language-picker";
import { TagInput } from "@/components/profile-2/tag-input";

interface Props {
  role: "mentor" | "mentee";
  initial: TProfileInput;
  topicSuggestions: string[];
}

/** react-hook-form stores array errors per item, so take the first message wherever it sits. */
function firstMessage(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as { message?: unknown } & Record<string, unknown>;
  if (typeof e.message === "string" && e.message) return e.message;
  for (const child of Object.values(e)) {
    const found = firstMessage(child);
    if (found) return found;
  }
  return undefined;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <FieldGroup>{children}</FieldGroup>
    </section>
  );
}

export function ProfileForm({ role, initial, topicSuggestions }: Props) {
  // Input type (what the form holds) and output type (what the schema produces after trimming and de-duplication) differ.
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TProfileInput, unknown, TProfile>({
    resolver: zodResolver(zProfile),
    defaultValues: initial,
  });

  const values = useWatch({ control }) as TProfileInput;
  const strength = useMemo(() => profileCompleteness(values, role), [values, role]);

  const timezone = values.timezone ?? "UTC";
  const timezones = useMemo(
    () => (TIMEZONES.includes(timezone as (typeof TIMEZONES)[number]) ? [...TIMEZONES] : [timezone, ...TIMEZONES]),
    [timezone],
  );

  async function onSubmit(formData: TProfile) {
    await handleFormSubmit({
      action: () => saveProfileAction(formData),
      setError,
      successMessage: "Profile saved",
      onSuccess: () => {
        reset(formData); // the saved (normalised) values become the new baseline
        appToast.success("Profile saved. Your matches now use it.");
      },
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="rounded-lg border bg-card p-4 text-card-foreground" aria-live="polite">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Profile strength</span>
          <span className="tabular-nums text-muted-foreground">
            {strength.done} of {strength.total}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted" aria-hidden>
          <div className="h-2 rounded bg-primary transition-all" style={{ width: `${(strength.done / strength.total) * 100}%` }} />
        </div>
        {strength.missing.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {strength.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Your profile has everything the matcher uses.</p>
        )}
      </div>

      <Section title="About you">
        <Field data-invalid={!!errors.full_name}>
          <FieldLabel htmlFor="full_name">Full name</FieldLabel>
          <Input id="full_name" type="text" maxLength={120} aria-invalid={!!errors.full_name} {...register("full_name")} />
          {errors.full_name && <FieldError>{errors.full_name.message}</FieldError>}
        </Field>

        <Field data-invalid={!!errors.bio}>
          <FieldLabel htmlFor="bio">Bio</FieldLabel>
          <Textarea id="bio" aria-invalid={!!errors.bio} {...register("bio")} />
          <FieldDescription>{(values.bio ?? "").length} / 2000</FieldDescription>
          {errors.bio && <FieldError>{errors.bio.message}</FieldError>}
        </Field>

        <Field data-invalid={!!errors.experience_level}>
          <FieldLabel htmlFor="experience_level">Experience level</FieldLabel>
          <Controller
            control={control}
            name="experience_level"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="experience_level" aria-invalid={!!errors.experience_level} className="w-full sm:max-w-xs" onBlur={field.onBlur}>
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.experience_level && <FieldError>{errors.experience_level.message}</FieldError>}
        </Field>
      </Section>

      <Section title="Where you are" description="Used to find people near you and to line up your available times.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={!!errors.city}>
            <FieldLabel htmlFor="city">City</FieldLabel>
            <Input id="city" type="text" aria-invalid={!!errors.city} {...register("city")} />
            {errors.city && <FieldError>{errors.city.message}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.state}>
            <FieldLabel htmlFor="state">State or region</FieldLabel>
            <Input id="state" type="text" aria-invalid={!!errors.state} {...register("state")} />
            {errors.state && <FieldError>{errors.state.message}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.country}>
            <FieldLabel htmlFor="country">Country</FieldLabel>
            <Input id="country" type="text" aria-invalid={!!errors.country} {...register("country")} />
            {errors.country && <FieldError>{errors.country.message}</FieldError>}
          </Field>
        </div>

        <Field data-invalid={!!errors.timezone}>
          <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="timezone" aria-invalid={!!errors.timezone} className="w-full sm:max-w-xs" onBlur={field.onBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {timezoneLabel(tz)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setValue("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone, { shouldDirty: true, shouldValidate: true })
              }
            >
              Use my current timezone
            </Button>
          </div>
          {errors.timezone && <FieldError>{errors.timezone.message}</FieldError>}
        </Field>
      </Section>

      <Section title="Languages" description="Matching favours people you can talk to in a shared language.">
        <Controller
          control={control}
          name="languages"
          render={({ field }) => <LanguagePicker value={field.value} onChange={field.onChange} error={firstMessage(errors.languages)} />}
        />
      </Section>

      <Section title="Topics" description="Free-text tags. Reusing a tag other people use (the suggestions) makes matches more accurate.">
        {role === "mentor" ? (
          <Controller
            control={control}
            name="skills"
            render={({ field }) => (
              <TagInput
                label="Skills you can teach"
                hint="For example: React, Fundraising, Product Management"
                values={field.value}
                onChange={field.onChange}
                suggestions={topicSuggestions}
                error={firstMessage(errors.skills)}
              />
            )}
          />
        ) : (
          <Controller
            control={control}
            name="goals"
            render={({ field }) => (
              <TagInput
                label="What you want to learn"
                hint="For example: TypeScript, Public Speaking, Startup Strategy"
                values={field.value}
                onChange={field.onChange}
                suggestions={topicSuggestions}
                error={firstMessage(errors.goals)}
              />
            )}
          />
        )}
        <Controller
          control={control}
          name="interests"
          render={({ field }) => (
            <TagInput
              label="Interests"
              hint="For example: Open Source, Climate Tech, Writing"
              values={field.value}
              onChange={field.onChange}
              suggestions={topicSuggestions}
              error={firstMessage(errors.interests)}
            />
          )}
        />
      </Section>

      <Section title="Availability">
        <Controller
          control={control}
          name="availability"
          render={({ field }) => (
            <AvailabilityEditor value={field.value} onChange={field.onChange} timezone={timezone} error={firstMessage(errors.availability)} />
          )}
        />
      </Section>

      <FieldGroup>
        {errors.root?.message && <FieldError>{errors.root.message}</FieldError>}
        <Field orientation="horizontal">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save profile"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
