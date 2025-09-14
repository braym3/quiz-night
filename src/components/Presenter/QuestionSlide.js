import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { storage } from '../../index';
import { ref, getDownloadURL } from 'firebase/storage';
import styles from './QuestionSlide.module.css';

export default function QuestionSlide({ question, round }) {
    const [imageUrl, setImageUrl] = useState(null);

    useEffect(() => {
        setImageUrl(null);
        if (question.imageUrl) {
            const imageRef = ref(storage, question.imageUrl);
            getDownloadURL(imageRef)
                .then((url) => {
                    setImageUrl(url);
                })
                .catch((error) => {
                    console.error("Error getting image URL:", error);
                });
        }
    }, [question.imageUrl]);

    const questionIdsInRound = Object.keys(round.questions);
    const questionNumber = questionIdsInRound.indexOf(question.id) + 1;


    return (
        <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, duration: 0.5 }}
        >
            <div className={styles.questionNumberBanner}>Question {questionNumber}</div>
            <div className={styles.questionContent}>
                
                {imageUrl && <img src={imageUrl} alt={question.text} className={styles.questionImage} />}
                
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