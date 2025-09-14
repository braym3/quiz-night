import React from 'react';
import { motion } from 'framer-motion';
import styles from './AnswerSlide.module.css';

// Animation variants for the list container
const listVariants = {
    visible: {
        opacity: 1,
        transition: {
            when: "beforeChildren",
            staggerChildren: 0.3, // Each item will appear 0.3s after the previous one
        },
    },
    hidden: {
        opacity: 0,
    },
};

// Animation variants for each list item
const itemVariants = {
    visible: { opacity: 1, y: 0 },
    hidden: { opacity: 0, y: 20 },
};


export default function AnswerSlide({ question }) {
    
    // If the question is an ordering question, we render a special list
    if (question && question.type === 'ordering') {
        return (
            <motion.div
                className={`${styles.card} ${styles.orderingCard}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className={styles.title}>The Correct Order Is...</h2>
                <motion.ol
                    className={styles.answerList}
                    initial="hidden"
                    animate="visible"
                    variants={listVariants}
                >
                    {question.answer.map((item, index) => (
                        <motion.li key={index} className={styles.answerListItem} variants={itemVariants}>
                            <span className={styles.itemNumber}>{index + 1}</span>
                            {item}
                        </motion.li>
                    ))}
                </motion.ol>
            </motion.div>
        );
    }

    // --- Fallback for all other question types ---
    let correctAnswerText = '';
    if (question) {
        if (question.type === 'multiple_choice' || question.type === 'true_false') {
            correctAnswerText = question.options[question.answer];
        } else {
            correctAnswerText = question.answer;
        }
    }
    const isLongAnswer = correctAnswerText.length > 40;

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
                <p className={`${styles.correctAnswer} ${isLongAnswer ? styles.longAnswer : ''}`}>
                    {correctAnswerText}
                </p>
            </div>
        </motion.div>
    );
}