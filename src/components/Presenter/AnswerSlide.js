import React from 'react';
import { motion } from 'framer-motion';
import styles from './AnswerSlide.module.css';

// Animation variants for the list container
const listVariants = {
    visible: {
        opacity: 1,
        transition: {
            when: "beforeChildren",
            staggerChildren: 0.3,
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
    
    // If the question is an ordering question, render the animated list
    if (question && question.type === 'ordering') {
        return (
            <motion.div
                className={`${styles.card} ${styles.orderingCard}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className={styles.title}>The Answer Is...</h2>
                <motion.ol
                    className={styles.answerList}
                    initial="hidden"
                    animate="visible"
                    variants={listVariants}
                >
                    {question.answer.map((item, index) => {
                        const detailItem = question.answerDetails?.find(d => d.option === item);
                        return (
                            <motion.li key={index} className={styles.answerListItem} variants={itemVariants}>
                                <div className={styles.itemContent}>
                                    <span className={styles.itemNumber}>{index + 1}</span>
                                    {item}
                                </div>
                                {detailItem && (
                                    <span className={styles.itemDetail}>{detailItem.detail}</span>
                                )}
                            </motion.li>
                        );
                    })}
                </motion.ol>
            </motion.div>
        );
    }
    
    // If it's a multiple-choice question with details for all options
    if (question && (question.type === 'multiple_choice') && question.answerDetails?.options) {
        const correctAnswerText = question.options[question.answer];
        return (
            <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20, duration: 0.5 }}
            >
                <h2 className={styles.title}>The Answer Is...</h2>
                <p className={styles.correctAnswer}>{correctAnswerText}</p>
                <ul className={styles.mcDetailsList}>
                    {Object.entries(question.options).map(([key, value]) => (
                        <li key={key} className={key === question.answer ? styles.correctMcItem : styles.mcItem}>
                            <span>{value}</span>
                            <span>{question.answerDetails.options[key]}</span>
                        </li>
                    ))}
                </ul>
            </motion.div>
        );
    }


    // --- Fallback for all other question types (e.g., text_input with a fun fact) ---
    let correctAnswerText = '';
    let detailText = question?.answerDetails?.detail || '';

    if (question) {
        if (question.type === 'true_false') {
            correctAnswerText = question.options[question.answer];
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
                {detailText && <p className={styles.funFact}>{detailText}</p>}
            </div>
        </motion.div>
    );
}