export default function getGreeting() {
  const timeNow = new Date().getHours();
  const greeting =
    timeNow >= 5 && timeNow < 12
      ? "Good morning"
      : timeNow >= 12 && timeNow < 18
        ? "Good afternoon"
        : "Good evening";

  return greeting;
}
