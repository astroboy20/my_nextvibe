// data.ts

type Content = {
    title: string;
    description: string;
    buttonText: string;
    imageSrc: string;
    link?: string;
    imageAlt: string;
  };
  export const tabContent: {
    Attendee: Content[];
    Organizer: Content[];
    Sponsor: Content[];
  } = {
    Attendee: [
      {
        title:
          "Ever felt you're missing out? Finding events has never been easier",
        description:
          "Our location-based engine shows you what's happening around you right now. We pick events you'll love based on what you're into, making it easy to find fun stuff to do.",
        buttonText: "Find Events",
        imageSrc: "/how1.png",
        link: "/explore",
        imageAlt: "Event Illustration",
      },
      {
        title: "Earn as you capture and share",
        description:
          "Showcase your event experiences, earn rewards for popular posts with sponsored backdrops, join the community conversation.",
        buttonText: "Start Capturing",
        imageSrc: "/capture.png",
        imageAlt: "Capturing",
      },
      {
        title: "Join events and capture your best moments",
        description:
          "RSVP to events and capture memories using our AI-powered digital backdrops, providing a unique canvas for your photos and videos.",
        buttonText: "Join Events",
        imageSrc: "/join event.png",
        imageAlt: "Join Event",
      },
      {
        title: "Engage with brand sponsors and attendees",
        description:
          "Connect with fellow attendees and engage yourself in exclusive, sponsored content from top brands for a truly shared experience.",
        buttonText: "Discover Events",
        imageSrc: "/brand.png",
        imageAlt: "Brand Illustration",
      },
    ],
  
    Organizer: [
      {
        title:
          "Showcase and boost your event’s publicity on the NextVibe Explore Page",
        description:
          "Maximize visibility by placing your event on the NextVibe Explore page, where it’s directly showcased to users who match your event’s interests and demographics.",
        buttonText: "Create Events",
        imageSrc: "/create_events.png",
        imageAlt: "Create Events",
      },
      {
        title: "Boost Event Sharing with our AI-Powered Backdrops",
        description:
          "Leverage our unique AI-backdrop technology to make your event memorable and share-worthy.",
        buttonText: "Learn More",
        imageSrc: "/learn_more.png",
        imageAlt: "Learn More",
      },
      {
        title: "Track Event Success with Real-Time Analytics",
        description:
          "Gain insights into attendee engagement, content sharing, and overall reach with real-time feedback and analytics.",
        buttonText: "Start Creating",
        imageSrc: "/start_creating.png",
        imageAlt: "Start Creating",
      },
    ],
  
    Sponsor: [
      {
        title: "Reach the Right Audience at the Right Time",
        description:
          "Sponsor digital backdrops that align with your brand’s identity and gain exposure through user-generated content.",
        buttonText: "Create Events",
        imageSrc: "/organize1.png",
        imageAlt: "Create Events",
      },
      {
        title: "Leverage Real-Time Insights for Impactful Strategy",
        description:
          "Benefit from real-time analytics to track the performance and effectiveness of your sponsored content.",
        buttonText: "Learn More",
        imageSrc: "/organize2.png",
        imageAlt: "Learn More",
      },
      {
        title: "Boost Engagement with Reward-Based Incentives",
        description:
          "Increase user interaction by offering rewards for users who amplify your brand through their social media posts.",
        buttonText: "Start Creating",
        imageSrc: "/organize3.png",
        imageAlt: "Start Creating",
      },
      // {
      //   title: "Engage with brand sponsors and attendees",
      //   description:
      //     "Connect with fellow attendees and engage yourself in exclusive, sponsored content from top brands for a truly shared experience.",
      //   buttonText: "Discover Events",
      //   imageSrc: "/brand.png",
      //   imageAlt: "Brand Illustration",
      // },
    ],
  };
  
  export const eventType = [
    { value: "wedding", label: "Wedding" },
    { value: "conference", label: "Conference" },
    { value: "party", label: "Party" },
    { value: "Concert", label: "Concert" },
    { value: "Exhibitions", label: "Exhibitions" },
    { value: "Festivals", label: "Festivals" },
    { value: "Graduation", label: "Graduation" },
    { value: "Others", label: "Others" },
  ];
  
  export const noOfAttendees = [
    { value: "1-100", label: "1-100" },
    { value: "101-500", label: "101-500" },
    { value: "501-1000", label: "501-1000" },
    { value: "1001-5000", label: "1001-5000" },
    // { value: "5000+", label: "5000+" },
  ];
  
  // List of interests
  export const interests = [
    { value: "concerts", label: "Concerts" },
    { value: "birthdays", label: "Birthdays" },
    { value: "lectures", label: "Lectures" },
    { value: "exhibition", label: "Exhibition" },
    { value: "rave", label: "Rave" },
    { value: "hangouts", label: "Hangouts" },
    { value: "festivals", label: "Festivals" },
    { value: "techfest", label: "TechFest" },
    { value: "trade-fair", label: "Trade Fair" },
    { value: "art", label: "Art" },
    { value: "adventure", label: "Adventure" },
    { value: "weddings", label: "Weddings" },
    { value: "beach", label: "Beach" },
    { value: "karaoke", label: "Karaoke" },
    { value: "religion", label: "Religion" },
    { value: "worship", label: "Worship" },
  ];
  