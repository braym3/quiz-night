import React from 'react';
import { motion } from 'framer-motion';
import styles from './AnswerSlide.module.css';

export default function AnswerSlide({ question }) {
    // This logic formats the answer correctly for different question types
    let correctAnswerText = '';
    if (question) {
        if (question.type === 'multiple_choice' || question.type === 'true_false') {
            correctAnswerText = question.options[question.answer];
        } else if (question.type === 'ordering') {
            correctAnswerText = question.answer.join(' → ');
        } else {
            correctAnswerText = question.answer;
        }
    }

    return (
        <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, duration: 0.5 }}
        >
            <div className={styles.answerContent}>
                <h2 className={styles.title}>The Answer Is...</h2>
                <p className={styles.correctAnswer}>{correctAnswerText}</p>
            </div>
        </motion.div>
    );
}