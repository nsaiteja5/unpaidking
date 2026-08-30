"use client";
export function CopyTweet({ text }: { text: string }) { return <button className="steal-button" onClick={() => navigator.clipboard.writeText(text)}>Copy the tweet</button>; }
