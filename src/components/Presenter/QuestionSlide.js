import React from 'react';
import { motion } from 'framer-motion';
import styles from './QuestionSlide.module.css';

export default function QuestionSlide({ question, round }) {
    return (
        <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, duration: 0.5 }}
        >
            <div className={styles.questionNumberBanner}>Question X</div>
            <div className={styles.questionContent}>
                <p className={styles.questionText}>{question.text}</p>
                
                {question.options && (
                    <div className={styles.options}>
                        {Object.values(question.options).map((option, index) => (
                           <React.Fragment key={index}>
                             <span className={styles.option}>{option}</span>
                             {index < Object.values(question.options).length - 1 && <span className={styles.or}>OR</span>}
                           </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}