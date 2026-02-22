const PARTICIPANT_TOKEN_PREFIX = "unanimy:pt:";

function tokenKey(decisionId: string) {
  return `${PARTICIPANT_TOKEN_PREFIX}${decisionId}`;
}

export function getParticipantToken(decisionId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(tokenKey(decisionId));
}

export function setParticipantToken(decisionId: string, token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(tokenKey(decisionId), token);
}
