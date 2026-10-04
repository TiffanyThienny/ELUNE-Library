import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data into Elunè database...');

  // 1. Create default demo user
  const passwordHash = await bcrypt.hash('password123', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@elune.read' },
    update: {},
    create: {
      id: 'usr_demo_eleanor',
      name: 'Eleanor Vance',
      email: 'demo@elune.read',
      passwordHash,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    }
  });

  console.log(`Created/found user: ${demoUser.name} (${demoUser.email})`);

  // 2. Seed initial books from mockBooks
  const book1 = await prisma.book.upsert({
    where: { id: 'meditations-aurelius' },
    update: {},
    create: {
      id: 'meditations-aurelius',
      title: 'Meditations',
      author: 'Marcus Aurelius',
      category: 'History',
      coverBg: 'linear-gradient(135deg, #4A3E3D 0%, #2A2120 100%)',
      coverTextColor: '#F7E7CE',
      readingTime: '4 hrs 15 mins',
      totalPages: 248,
      publicationYear: '180 AD',
      isAudioAvailable: true,
      audioDuration: '3 hrs 45 mins',
      description: 'Personal writings of the Roman Emperor Marcus Aurelius detailing his private notes on Stoic philosophy, self-discipline, resilience, and ethical living in an unpredictable world.',
      chapters: {
        create: [
          {
            id: 'ch-1',
            chapterNumber: 1,
            title: 'Debts and Lessons from My Elders',
            readingTime: '20 mins',
            summary: 'Marcus Aurelius reflects on the virtues and morals he acquired from his grandfather, father, mother, and teachers.',
            content: `From my grandfather Verus, I learned good morals and the government of my temper. From the reputation and remembrance of my father, modesty and a manly character. From my mother, piety and beneficence, and abstinence, not only from evil deeds, but even from evil thoughts; and further, simplicity in my way of living, far removed from the habits of the rich.

When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil. But I have seen the beauty of good, and the ugliness of evil, and I have recognized that the wrongdoer has a nature related to my own — not of the same blood or birth, but the same mind, and possessing a share of the divine. And so none of them can hurt me. No one can implicate me in ugliness. Nor can I be angry at my relative, or hate him. We were born to work together like feet, hands, and the rows of the upper and lower teeth. To obstruct one another is unnatural. To feel anger at someone, to turn your back on him: these are obstructions.

Whatever this is that I am, it is a little flesh and breath, and the ruling part. Degrade not your mind. Do not let it be enslaved, nor pulled like a puppet by every impulse. Let not your ruling reason be discontented with its present lot or dread the future.`
          },
          {
            id: 'ch-2',
            chapterNumber: 2,
            title: 'On the Ruling Mind & Tranquility',
            readingTime: '25 mins',
            summary: 'An inquiry into preserving an unshakeable inner citadel amidst external chaos and opinion.',
            content: `Perform every act of your life as if it were your last. Lay aside all carelessness, all passionate aversion to the commands of reason, all hypocrisy, self-love, and dissatisfaction with your own share. You see how few things a person needs to master in order to live a tranquil and god-fearing life.

Remember how long you have put off these things, and how often you have received a opportunity from the gods, and yet do not use it. You must now at last perceive of what universe you are a part, and of what governor of the universe your existence is an efflux. A limit of time is fixed for you, which if you do not use for clearing away the clouds from your mind, it will go and never return.

Never regard something as beneficial to you that will ever force you to break your pledge, to lose your self-respect, to hate anyone, to suspect, to curse, to act hypocritically, or to desire anything that needs walls and curtains to hide it.`
          },
          {
            id: 'ch-3',
            chapterNumber: 3,
            title: 'Inner Citadel and Impermanence',
            readingTime: '30 mins',
            summary: 'Reflecting on nature, change, and retreat into one’s internal sanctuary.',
            content: `People look for retreats for themselves, in the country, by the coast, or in the hills. There is nowhere that a person can find a more peaceful and trouble-free retreat than in his own mind. So constantly give yourself this retreat, and renew yourself. Let your principles be brief and fundamental, the kind that will at once close out the world and send you back without irritation to the life to which you must return.

Loss is nothing else but change, and change is Nature's delight. Everything happens according to nature's ordinance. Look at the swiftness of the stream in which all things are borne past us.`
          }
        ]
      },
      summaries: {
        create: [
          {
            summaryType: 'book',
            content: JSON.stringify({
              quickOverview: 'Meditations is a masterpiece of Stoic philosophy written as a private diary by Roman Emperor Marcus Aurelius. It emphasizes self-mastery, emotional resilience, duty, and accepting impermanence.',
              mainIdeas: [
                'Our thoughts determine the quality of our life, not external circumstance.',
                'Acceptance of what we cannot control releases anxiety.',
                'Living with integrity and serving the common good is our primary calling.'
              ],
              keyTakeaways: [
                'You have power over your mind — not outside events. Realize this, and you will find strength.',
                'It is not death that a man should fear, but he should fear never beginning to live.',
                'The best revenge is to be unlike him who performed the injury.'
              ],
              importantConcepts: [
                { title: 'The Inner Citadel', explanation: 'The mind as a fortress unaffected by external chaos if disciplined properly.' },
                { title: 'Amor Fati', explanation: 'Love of fate — embracing every obstacle as material for personal growth.' }
              ]
            })
          }
        ]
      }
    }
  });

  const book2 = await prisma.book.upsert({
    where: { id: 'architecture-of-silence' },
    update: {},
    create: {
      id: 'architecture-of-silence',
      title: 'The Architecture of Silence',
      author: 'Evelyn St. Claire',
      category: 'Psychology',
      coverBg: 'linear-gradient(135deg, #CDB891 0%, #A6916B 100%)',
      coverTextColor: '#2C2421',
      readingTime: '3 hrs 40 mins',
      totalPages: 192,
      publicationYear: '2024',
      isAudioAvailable: true,
      audioDuration: '3 hrs 10 mins',
      description: 'An architectural exploration of quiet spaces, auditory sanctuaries, and how intentional stillness restores creative mental bandwidth in our noisy world.',
      chapters: {
        create: [
          {
            id: 'silence-1',
            chapterNumber: 1,
            title: 'The Overstimulated Mind',
            readingTime: '15 mins',
            summary: 'Understanding modern cognitive overload and sensory fatigue caused by constant digital stimulation.',
            content: `Silence is not the absence of sound, but the presence of awareness. In an age dominated by notification alerts and background buzz, silence has shifted from a default state to a rare luxury. 

When silence is restored to our living environments, cognitive load decreases, opening pathways for deliberate contemplation and emotional grounding.`
          },
          {
            id: 'silence-2',
            chapterNumber: 2,
            title: 'Designing Sacral Quiet Spaces',
            readingTime: '25 mins',
            summary: 'Principles of acoustic proportion, soft textured materials, and sanctuary room layout.',
            content: `True quiet spaces require intentional architectural design. Acoustic resonance, natural timber surfaces, and linen drapery work in harmony to absorb high frequencies and produce an acoustic cushion. Such rooms invite deceleration and deeper contemplation.`
          }
        ]
      },
      summaries: {
        create: [
          {
            summaryType: 'book',
            content: JSON.stringify({
              quickOverview: 'The Architecture of Silence explores how physical and mental spaces designed for quietness drastically improve human cognition and emotional well-being.',
              mainIdeas: [
                'Silence is active awareness rather than empty void.',
                'Sensory overload fragments working memory and creative problem-solving.',
                'Intentional spatial design cultivates tranquility.'
              ],
              keyTakeaways: [
                'Carve out 30 minutes of intentional auditory quiet every day.',
                'Minimize clutter and excessive harsh reflection in your reading room.'
              ],
              importantConcepts: [
                { title: 'Auditory Sanctuary', explanation: 'A designated room or nook shielded from digital alerts and background noise.' }
              ]
            })
          }
        ]
      }
    }
  });

  const book3 = await prisma.book.upsert({
    where: { id: 'art-of-clarity' },
    update: {},
    create: {
      id: 'art-of-clarity',
      title: 'The Art of Clear Thinking',
      author: 'Clara V. Vance',
      category: 'Self Development',
      coverBg: 'linear-gradient(135deg, #C3B091 0%, #8C785B 100%)',
      coverTextColor: '#2C2421',
      readingTime: '5 hrs 10 mins',
      totalPages: 310,
      publicationYear: '2023',
      isAudioAvailable: true,
      audioDuration: '4 hrs 50 mins',
      description: 'A comprehensive field guide to mental models, cognitive biases, and systematic frameworks for making calm, rational decisions in uncertain conditions.',
      chapters: {
        create: [
          {
            id: 'clarity-1',
            chapterNumber: 1,
            title: 'First Principles Thinking',
            readingTime: '20 mins',
            summary: 'Deconstructing complex problems into their most fundamental truths before reasoning upward.',
            content: `First principles thinking is one of the most effective mental models to eliminate bias and convention. Instead of reasoning by analogy—copying how others have solved similar challenges—first principles reasoning breaks an idea down to its immutable bedrock.`
          }
        ]
      }
    }
  });

  // Seed UserBook (favorites & library)
  await prisma.userBook.upsert({
    where: {
      userId_bookId: {
        userId: demoUser.id,
        bookId: book1.id
      }
    },
    update: {},
    create: {
      userId: demoUser.id,
      bookId: book1.id,
      isFavorite: true
    }
  });

  await prisma.userBook.upsert({
    where: {
      userId_bookId: {
        userId: demoUser.id,
        bookId: book2.id
      }
    },
    update: {},
    create: {
      userId: demoUser.id,
      bookId: book2.id,
      isFavorite: true
    }
  });

  // Seed ReadingProgress
  await prisma.readingProgress.upsert({
    where: {
      userId_bookId: {
        userId: demoUser.id,
        bookId: book1.id
      }
    },
    update: {},
    create: {
      userId: demoUser.id,
      bookId: book1.id,
      currentPage: 34,
      currentChapter: 0,
      progressPercentage: 24
    }
  });

  // Seed Highlights
  const existingHl = await prisma.highlight.findFirst({
    where: { userId: demoUser.id, bookId: book1.id }
  });
  if (!existingHl) {
    await prisma.highlight.create({
      data: {
        userId: demoUser.id,
        bookId: book1.id,
        chapterId: 'ch-1',
        chapterTitle: 'Debts and Lessons from My Elders',
        text: 'When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly...',
        color: 'yellow',
        note: 'Essential morning perspective for peaceful interactions.'
      }
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
