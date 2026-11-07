import { For, Match, Show, Switch, createSignal, onMount } from "solid-js";

import { Trans } from "@lingui/solid/macro";

import { useClientLifecycle } from "@revolt/client";
import { useInstance } from "@revolt/instance";
import { A, useNavigate } from "@revolt/routing";
import { Button, Column, Text, TextField } from "@revolt/ui";

import { FlowTitle } from "./Flow";
import { Form } from "./Form";

type Candidate = {
  id: string;
  nickname: string;
};

type StartResponse = {
  challenge_id: string;
  candidates: Candidate[];
  fallback: boolean;
};

type SendResponse = {
  ok: boolean;
  expires_at: number;
  nickname: string;
};

type SessionResponse = {
  _id: string;
  token: string;
  user_id: string;
};

type Step = "loading" | "select" | "sent" | "error";

function errorMessage(error: unknown): string {
  const type = (error as { type?: string } | undefined)?.type;

  switch (type) {
    case "InvalidToken":
      return "That code is not correct, or it has expired. Check TeamSpeak and try again.";
    case "NotFound":
      return "Your TeamSpeak client went offline. Start over and keep TeamSpeak connected.";
    case "InSlowmode":
      return "Too many attempts. Wait a minute and try again.";
    case "FeatureDisabled":
      return "TeamSpeak login is not enabled on this instance.";
    case "InternalError":
      return "TeamSpeak authentication is unavailable right now.";
    default:
      return "Something went wrong. Try again.";
  }
}

/**
 * Flow for joining or logging in through TeamSpeak.
 *
 * The backend lists online TS3 clients that match this browser's IP (with an
 * "all online clients" fallback), sends a short code to the selected client as
 * a private message, and creates a normal North Chat session after verification.
 */
export default function FlowTs3() {
  const instance = useInstance();

  // The generated API client only knows generated routes; bypass it for the
  // new TeamSpeak endpoints so the JSON body is sent as-is.
  async function post(path: string, body?: unknown) {
    const response = await fetch(`${instance.apiUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw data ?? { type: "InternalError" };
    }

    return data;
  }
  const navigate = useNavigate();
  const { loginWithSession } = useClientLifecycle();

  const [step, setStep] = createSignal<Step>("loading");
  const [challengeId, setChallengeId] = createSignal("");
  const [candidates, setCandidates] = createSignal<Candidate[]>([]);
  const [fallback, setFallback] = createSignal(false);
  const [nickname, setNickname] = createSignal("");
  const [error, setError] = createSignal<string>();
  const [sending, setSending] = createSignal(false);
  const [verifying, setVerifying] = createSignal(false);

  async function start() {
    setStep("loading");
    setError(undefined);

    try {
      const data = (await post("/auth/ts3/start", {})) as StartResponse;
      setChallengeId(data.challenge_id);
      setCandidates(data.candidates);
      setFallback(data.fallback);
      setStep("select");
    } catch (err) {
      setError(errorMessage(err));
      setStep("error");
    }
  }

  async function send(candidate: Candidate) {
    setSending(true);
    setError(undefined);

    try {
      const data = (await post("/auth/ts3/send", {
        challenge_id: challengeId(),
        candidate_id: candidate.id,
      })) as SendResponse;

      setNickname(data.nickname);
      setStep("sent");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function verify(data: FormData) {
    const code = String(data.get("code") ?? "").trim();

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from TeamSpeak.");
      return false;
    }

    setVerifying(true);
    setError(undefined);

    try {
      const session = (await post("/auth/ts3/verify", {
        challenge_id: challengeId(),
        code,
      })) as SessionResponse;

      await loginWithSession(session);
      navigate("/login/auth", { replace: true });
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setVerifying(false);
    }
  }

  onMount(() => {
    void start();
  });

  return (
    <>
      <FlowTitle
        subtitle={
          <Trans>
            Verify with your TeamSpeak account. We send a short code to your
            TeamSpeak client — no password required.
          </Trans>
        }
      >
        <Trans>Join with TeamSpeak</Trans>
      </FlowTitle>

      <Show when={error()}>
        <div
          style={{
            color: "var(--md-sys-color-error)",
            "font-size": "0.95rem",
          }}
        >
          {error()}
        </div>
      </Show>

      <Switch>
        <Match when={step() === "loading"}>
          <Text class="body">
            <Trans>Looking for your TeamSpeak client…</Trans>
          </Text>
        </Match>

        <Match when={step() === "error"}>
          <Button variant="filled" onPress={start}>
            <Trans>Try again</Trans>
          </Button>
          <A href="/login/create">
            <Button variant="text">
              <Trans>Use email instead</Trans>
            </Button>
          </A>
        </Match>

        <Match when={step() === "select"}>
          <Show
            when={candidates().length > 0}
            fallback={
              <>
                <Text class="body">
                  <Trans>
                    You are not online on TeamSpeak right now. Connect to the
                    server, stay online, and try again.
                  </Trans>
                </Text>
                <Button variant="filled" onPress={start}>
                  <Trans>Retry</Trans>
                </Button>
                <A href="/login/create">
                  <Button variant="text">
                    <Trans>Use email instead</Trans>
                  </Button>
                </A>
              </>
            }
          >
            <Show when={fallback()}>
              <Text class="body">
                <Trans>
                  We could not match your IP to a TeamSpeak client. Select your
                  identity below — the code sent via TeamSpeak still proves it
                  is you.
                </Trans>
              </Text>
            </Show>

            <Column gap="sm" align>
              <For each={candidates()}>
                {(candidate) => (
                  <Button
                    variant="tonal"
                    isDisabled={sending()}
                    onPress={() => send(candidate)}
                  >
                    Send code to {candidate.nickname}
                  </Button>
                )}
              </For>
            </Column>

            <Show when={sending()}>
              <Text class="body">
                <Trans>Sending the code…</Trans>
              </Text>
            </Show>

            <A href="/login/create">
              <Button variant="text">
                <Trans>Use email instead</Trans>
              </Button>
            </A>
          </Show>
        </Match>

        <Match when={step() === "sent"}>
          <Text class="body">
            <Trans>
              Code sent to {nickname()} in TeamSpeak as a private message. It
              expires in a few minutes.
            </Trans>
          </Text>

          <Form onSubmit={verify}>
            <TextField
              required
              name="code"
              type="text"
              label="Code"
              placeholder="123456"
              inputmode="numeric"
              autocomplete="one-time-code"
              minlength={6}
              maxlength={6}
            />
            <Button type="submit" size="md" isDisabled={verifying()}>
              {verifying() ? "Verifying…" : "Verify"}
            </Button>
          </Form>

          <Button variant="text" onPress={start}>
            <Trans>Start over</Trans>
          </Button>
          <A href="/login/create">
            <Button variant="text">
              <Trans>Use email instead</Trans>
            </Button>
          </A>
        </Match>
      </Switch>
    </>
  );
}
