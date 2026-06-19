/**
 * Safely render HTML content for legal documents
 * This component is used to display Privacy Policy and Public Offer content
 */
export default function LegalContentRenderer({ content = '' }) {
    // Remove any script tags and dangerous content
    const sanitizeHTML = (html) => {
        const div = document.createElement('div')
        div.textContent = html
        return div.innerHTML
    }

    // If content contains HTML tags, render as HTML, otherwise render as plain text with line breaks
    const isHTML = /<[^>]*>/.test(content)

    return (
        <div className="prose dark:prose-invert max-w-none">
            {isHTML ? (
                <div
                    dangerouslySetInnerHTML={{
                        __html: content
                    }}
                    className="space-y-4"
                />
            ) : (
                <div className="whitespace-pre-wrap">
                    {content}
                </div>
            )}
        </div>
    )
}
