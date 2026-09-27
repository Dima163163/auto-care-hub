/** Shared paint servers used to give workspace Lucide icons one restrained brand treatment. */
export function WorkspaceIconDefinitions() {
    return (
        <svg
            aria-hidden="true"
            className="workspace-icon-definitions"
            focusable="false"
            height="0"
            width="0"
        >
            <defs>
                <linearGradient
                    id="autocare-workspace-icon-gradient"
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    x2="24"
                    y1="0"
                    y2="24"
                >
                    <stop offset="0%" stopColor="var(--workspace-icon-start)" />
                    <stop offset="100%" stopColor="var(--workspace-icon-end)" />
                </linearGradient>
            </defs>
        </svg>
    )
}
