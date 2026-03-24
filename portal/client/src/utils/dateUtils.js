import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (dateString, option) => {
    const date = parseISO(dateString);
    if (option === 1) return format(date, 'MMM dd, yyyy \'at\' h:mm a');
    if (option === 2) return formatDistanceToNow(date, { addSuffix: true });
};

export const isPastDue = (dueDateString) => {
    const dueDate = parseISO(dueDateString);
    const now = new Date();
    return now > dueDate;
};

export const isPastDueSubmission = (submissionDateString, assDueDateString) => {
    const submissionDate = parseISO(submissionDateString);
    const assDueDate = parseISO(assDueDateString);
    return submissionDate > assDueDate;
};

export const calcDiffDays = (submissionDateString, assDueDateString) => {
    const submissionDate = parseISO(submissionDateString);
    const dueDate = parseISO(assDueDateString);
    const diffTime = submissionDate - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};