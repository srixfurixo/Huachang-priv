import DOMPurify from 'dompurify'

export const sanitizeInput = (value) => {
    return DOMPurify.sanitize(value.trim())
}

export default sanitizeInput