"use client";
import { startTransition, useEffect, useRef, type FormEvent } from "react";

/** React 19 resets a `<form action={fn}>` after every submit, even when the server refused the save, which wiped
 *  long edits (a lesson JSON, a question) whenever the compliance scan blocked them. Submitting through onSubmit
 *  keeps what the admin typed. `clearWhen` resets the form once, e.g. after a new record was created. */
export function useKeepForm(dispatch: (fd: FormData) => void, clearWhen?: string | false | null) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (clearWhen) ref.current?.reset(); }, [clearWhen]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Pass the clicked button so name/value pairs like op=grant|revoke reach the action.
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(fd));
  };
  return { ref, onSubmit };
}
