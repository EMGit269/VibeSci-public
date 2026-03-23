import type { Project } from './types';

export const initialProjectsData: Project[] = [
  {
    id: 'proj-1',
    name: 'AI Models Development',
    description: 'A project to develop and compare various AI models for different tasks.',
    createdAt: new Date().toISOString(),
    tasks: [
      {
        id: 'task-1',
        projectId: 'proj-1',
        name: 'Sentiment Analysis Model',
        problemDescription: 'Develop a model to classify text as positive, negative, or neutral. Explore both traditional and deep learning approaches.',
        createdAt: new Date().toISOString(),
        methods: [
          {
            id: 'method-1-1',
            name: 'Method A: Rule-based',
            description: 'A rule-based approach using keyword matching and sentiment lexicons.',
            codeSnippets: [
              {
                id: 'snippet-1-1-1',
                version: '1.0',
                purpose: 'Initial implementation of the rule-based sentiment classifier.',
                code: `def classify_sentiment(text):
    positive_keywords = ["happy", "great", "excellent", "love"]
    negative_keywords = ["sad", "bad", "terrible", "hate"]
    
    text_lower = text.lower()
    pos_count = sum(1 for word in positive_keywords if word in text_lower)
    neg_count = sum(1 for word in negative_keywords if word in text_lower)
    
    if pos_count > neg_count:
        return "Positive"
    elif neg_count > pos_count:
        return "Negative"
    else:
        return "Neutral"

# Example
print(classify_sentiment("This is a great movie! I love it."))
`,
                notesAndTradeoffs: 'Simple and interpretable, but fails on complex sentences and sarcasm. Relies heavily on the quality of the keyword lists.',
                createdAt: new Date().toISOString(),
              }
            ]
          },
          {
            id: 'method-1-2',
            name: 'Method B: ML-based',
            description: 'A machine learning approach using a simple Naive Bayes classifier.',
            codeSnippets: []
          }
        ],
      },
      {
        id: 'task-2',
        projectId: 'proj-1',
        name: 'Image Classification',
        problemDescription: 'Build a model to classify images into 10 categories (e.g., cat, dog, car).',
        createdAt: new Date().toISOString(),
        methods: [],
      }
    ],
  },
  {
    id: 'proj-2',
    name: 'Web Application Refactor',
    description: 'A project to refactor and modernize a legacy web application.',
    createdAt: new Date().toISOString(),
    tasks: [],
  }
];
