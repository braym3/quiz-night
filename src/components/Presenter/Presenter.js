import React, { useState, useEffect } from 'react';
import { database } from '../../index';
import { ref, onValue, get } from 'firebase/database';
import { AnimatePresence } from 'framer-motion';
import WelcomeSlide from './WelcomeSlide';
import RoundSlide from './RoundSlide';
import QuestionSlide from './QuestionSlide';
import AnswerSlide from './AnswerSlide';
import WinnersSlide from './WinnersSlide';
import Sparkles from './Sparkles';
import styles from './Presenter.module.css';
import { applyTheme, getTheme } from '../../utils/themes';

export default function Presenter() {
    const [gameState, setGameState] = useState(null);
    const [quizContent, setQuizContent] = useState(null);
    const [players, setPlayers] = useState([]);
    const [currentTheme, setCurrentTheme] = useState('fun-and-sparkly');

    useEffect(() => {
        // Remove default background for presenter view
        const rootElement = document.getElementById('root');
        document.body.style.backgroundImage = 'none';

        if (rootElement) {
            rootElement.style.padding = '0';
        }

        return () => {
            if (rootElement) {
                rootElement.style.padding = '20px';
            }
        };
    }, []);

    useEffect(() => {
        // Listen for active quiz changes and apply theme immediately
        const activeQuizIdRef = ref(database, 'liveGame/activeQuizId');

        const unsubscribe = onValue(activeQuizIdRef, async (snapshot) => {
            if (snapshot.exists()) {
                const quizId = snapshot.val();
                const quizRef = ref(database, `quizzes/${quizId}`);
                const quizSnapshot = await get(quizRef);

                if (quizSnapshot.exists()) {
                    const quiz = quizSnapshot.val();
                    setQuizContent(quiz);

                    // Apply theme for presenter view
                    const theme = quiz.theme || 'fun-and-sparkly';
                    setCurrentTheme(theme);

                    // Apply theme immediately without reload
                    applyTheme(theme, 'presenter');
                }
            } else {
                setCurrentTheme('fun-and-sparkly');
                applyTheme('fun-and-sparkly', 'presenter');
            }
        });

        onValue(ref(database, 'liveGame/gameState'), (snapshot) => setGameState(snapshot.val()));
        onValue(ref(database, 'liveGame/players'), (snapshot) => {
            if(snapshot.exists()) {
                const playersData = snapshot.val();
                const playersArray = Object.entries(playersData).map(([name, data]) => ({ name, ...data }));
                setPlayers(playersArray);
            } else {
                setPlayers([]);
            }
        });

        return unsubscribe;
    }, []);

    const renderSlide = () => {
        if (!gameState || !quizContent) {
            return <WelcomeSlide key="loading" title="Trivia Night!" subtitle="Getting ready..." />;
        }

        const { quizStatus, currentRoundId, currentQuestionId } = gameState;

        if (quizStatus === 'ended') {
            return <WinnersSlide key="winners" players={players} />;
        }

        if (quizStatus === 'waiting') {
            return <WelcomeSlide key="welcome" title={quizContent.title || "Trivia Night!"} subtitle="Get Ready!" playerCount={players.length} />;
        }

        const round = quizContent.rounds[currentRoundId];
        const question = round?.questions[currentQuestionId];

        if (quizStatus === 'round-interstitial') {
            return <RoundSlide key={currentRoundId} round={round} roundId={currentRoundId} />;
        }

        if (quizStatus === 'active' && question) {
            const questionWithId = { ...question, id: currentQuestionId };
            return <QuestionSlide key={currentQuestionId} question={questionWithId} round={round} players={players} />;
        }

        if (quizStatus === 'moderating' && question) {
            return <AnswerSlide key={`${currentQuestionId}-answer`} question={question} />;
        }

        return <WelcomeSlide key="fallback" title="Trivia Night!" subtitle="Please wait..." />;
    };

    // Use theme config to determine sparkles instead of hardcoded IDs
    const theme = getTheme(currentTheme);
    const showSparkles = theme.effects?.sparkles === true;

    return (
        <div className={`${styles.presenterContainer} presenterContainer`}>
            {showSparkles && <Sparkles />}
            <AnimatePresence mode="wait">
                {renderSlide()}
            </AnimatePresence>
        </div>
    );
}