import React, { useState, useEffect } from 'react';
import { database } from '../../index';
import { ref, onValue, get } from 'firebase/database';
import { AnimatePresence } from 'framer-motion';
import WelcomeSlide from './WelcomeSlide';
import RoundSlide from './RoundSlide';
import QuestionSlide from './QuestionSlide';
import AnswerSlide from './AnswerSlide';
import Sparkles from './Sparkles';
import styles from './Presenter.module.css';
import quizBackground from '../../assets/images/quiz-background.png';

export default function Presenter() {
    const [gameState, setGameState] = useState(null);
    const [quizContent, setQuizContent] = useState(null);

    useEffect(() => {
        const rootElement = document.getElementById('root');
        
        document.body.style.backgroundImage = 'none';
        if (rootElement) {
            rootElement.style.padding = '0';
        }

        return () => {
            document.body.style.backgroundImage = `url(${quizBackground})`;
            if (rootElement) {
                rootElement.style.padding = '20px';
            }
        };
    }, []);

    useEffect(() => {
        get(ref(database, 'liveGame/activeQuizId')).then((snapshot) => {
            if (snapshot.exists()) {
                const quizId = snapshot.val();
                get(ref(database, `quizzes/${quizId}`)).then((quizSnapshot) => {
                    if (quizSnapshot.exists()) {
                        setQuizContent(quizSnapshot.val());
                    }
                });
            }
        });

        onValue(ref(database, 'liveGame/gameState'), (snapshot) => {
            setGameState(snapshot.val())
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

        const round = quizContent.rounds[currentRoundId];
        const question = round?.questions[currentQuestionId];

        if (quizStatus === 'round-interstitial') {
            return <RoundSlide key={currentRoundId} round={round} roundId={currentRoundId} />;
        }
        
        if (quizStatus === 'active' && question) {
             const questionWithId = { ...question, id: currentQuestionId };
             return <QuestionSlide key={currentQuestionId} question={questionWithId} round={round} />;
        } 
        
        if (quizStatus === 'moderating' && question) {
            return <AnswerSlide key={`${currentQuestionId}-answer`} question={question} />;
        }

        return <WelcomeSlide key="fallback" title="Trivia Night!" subtitle="Please wait..." />;
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