import React, { useState, useEffect } from 'react';
import { database } from '../../index';
import { ref, onValue, get } from 'firebase/database';
import { AnimatePresence } from 'framer-motion';
import WelcomeSlide from './WelcomeSlide';
import RoundSlide from './RoundSlide';
import QuestionSlide from './QuestionSlide';
import AnswerSlide from './AnswerSlide'; // Import the new component
import Sparkles from './Sparkles';
import styles from './Presenter.module.css';

export default function Presenter() {
    const [gameState, setGameState] = useState(null);
    const [quizContent, setQuizContent] = useState(null);
    const [players, setPlayers] = useState([]);

    useEffect(() => {
        get(ref(database, 'quizContent')).then((snapshot) => {
            if (snapshot.exists()) setQuizContent(snapshot.val());
        });
        get(ref(database, 'players')).then((snapshot) => {
            if(snapshot.exists()) setPlayers(Object.values(snapshot.val()));
        });

        onValue(ref(database, 'quiz/gameState'), (snapshot) => setGameState(snapshot.val()));
        onValue(ref(database, 'players'), (snapshot) => {
            if(snapshot.exists()) setPlayers(Object.values(snapshot.val()));
        });
    }, []);

    const renderSlide = () => {
        if (!gameState || !quizContent) {
            return <WelcomeSlide key="loading" title="Trivia Night!" subtitle="Getting ready..." />;
        }

        const { quizStatus, currentRoundId, currentQuestionId } = gameState;
        
        if (quizStatus === 'waiting' || quizStatus === 'ended') {
             return <WelcomeSlide key="welcome" title="Trivia Night!" subtitle="Hannah's Birthday" />;
        }

        const round = quizContent[currentRoundId];
        const question = round?.questions[currentQuestionId];

        // UPDATED LOGIC: to show the correct slide based on the status
        if (quizStatus === 'active' && question) {
             return <QuestionSlide key={currentQuestionId} question={question} round={round} />;
        } 
        
        if (quizStatus === 'moderating' && question) {
            // When revealing the answer, show the new AnswerSlide
            return <AnswerSlide key={`${currentQuestionId}-answer`} question={question} />;
        }

        // Fallback to the round title slide
        return <RoundSlide key={currentRoundId} round={round} />;
    };

    return (
        <div className={styles.presenterContainer}>
          <Sparkles /> 
            <AnimatePresence mode="wait">
                {renderSlide()}
            </AnimatePresence>
        </div>
    );
}