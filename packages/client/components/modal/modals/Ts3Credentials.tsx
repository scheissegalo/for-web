import { createFormControl, createFormGroup } from "solid-forms";

import { Trans, useLingui } from "@lingui/solid/macro";

import { Column, Dialog, DialogProps, Form2, useSnackbar } from "@revolt/ui";

import { useModals } from "..";
import { Modals } from "../types";

/**
 * Add a real email/password to a TeamSpeak-created account so the user has a
 * recovery method if their TS3 identity ever changes.
 */
export function Ts3CredentialsModal(
  props: DialogProps & Modals & { type: "ts3_credentials" },
) {
  const { t } = useLingui();
  const { showError } = useModals();
  const snackbar = useSnackbar();

  const group = createFormGroup({
    email: createFormControl("", { required: true }),
    password: createFormControl("", { required: true }),
  });

  async function onSubmit() {
    try {
      const config = props.client.api.config;
      const response = await fetch(`${config.baseURL}/auth/ts3/credentials`, {
        method: "POST",
        headers: {
          ...config.headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: group.controls.email.value,
          password: group.controls.password.value,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          type: "InternalError",
        }));
        throw error;
      }

      snackbar.show({
        message: t`Email and password set. You can now use them to log in.`,
      });
      props.onClose();
    } catch (err) {
      showError(err);
    }
  }

  const submit = Form2.useSubmitHandler(group, onSubmit);

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Set email and password</Trans>}
      actions={[
        { text: <Trans>Close</Trans> },
        {
          text: <Trans>Save</Trans>,
          onClick: () => {
            onSubmit();
            return false;
          },
          isDisabled: !Form2.canSubmit(group),
        },
      ]}
      isDisabled={group.isPending}
    >
      <form onSubmit={submit}>
        <Column>
          <Form2.TextField
            name="email"
            type="email"
            label={t`Email`}
            control={group.controls.email}
            placeholder={t`someone@example.com`}
          />
          <Form2.TextField
            name="password"
            control={group.controls.password}
            label={t`New Password`}
            type="password"
            placeholder={t`Enter a new password.`}
          />
        </Column>
      </form>
    </Dialog>
  );
}
