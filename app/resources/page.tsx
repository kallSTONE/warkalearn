"use client"

import React from "react"

const resources = [
    {
        key: "placement-test",
        title: "Skills placement check",
        description: "Quick assessment to find your current level and a recommended starting point.",
    },
    {
        key: "speaking-guide",
        title: "Study practice guide",
        description: "Daily routines and prompts to build consistency and confidence.",
    },
    {
        key: "pronunciation-drills",
        title: "Presentation drills",
        description: "Targeted exercises and rehearsal steps to sharpen delivery.",
    },
    {
        key: "email-templates",
        title: "Professional email templates",
        description: "Common workplace email formats with useful prompts and tips.",
    },
]

export default function ResourcesPage() {
    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-4">Resources</h1>
                <p className="text-sm text-muted-foreground mb-6">Download practice materials, templates, and guides to support your Neway learning plan.</p>

                <div className="space-y-4">
                    {resources.map((r) => (
                        <div key={r.key} className="p-4 border rounded-md bg-card">
                            <h2 className="text-lg font-semibold">{r.title}</h2>
                            <p className="text-sm text-muted-foreground mb-3">{r.description}</p>

                            <div className="flex gap-3">
                                <a
                                    href={`/api/download?file=${encodeURIComponent(r.key)}`}
                                    className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-95"
                                >
                                    Download PDF
                                </a>

                                <a
                                    href={`/api/download?file=${encodeURIComponent(r.key)}`}
                                    className="inline-flex items-center px-4 py-2 rounded-md border"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Open in new tab
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}