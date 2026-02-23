export type Stop = {
  name: string;
  category: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  duration: string;
  description: string;
};
export const tours = [
  {
    title: "Würzburg Altstadt & Festung",
    duration: "5h",
    difficulty: "leicht",
    stops: [
      {
        name: "Marktplatz Würzburg",
        category: "Kultur",
        coordinates: {
          lat: 49.7945,
          lng: 9.9293
        },
        duration: "30min",
        description: "Springbrunnen & Altstadt"
      },
      {
        name: "Käppele Würzburg",
        category: "Kultur",
        coordinates: {
          lat: 49.7842,
          lng: 9.9218  
        },      
        duration: "60min",
        description: "Aussicht und Kirche"
      },
      {
        name: "Festung Würzburg",
        category: "Kultur",
        coordinates: {
          lat: 49.7897,
          lng: 9.9209  
        } ,          
        duration: "120min",
        description: "Aussicht & Historie"
      },
      {
        name: "Gasthof Alter Kranen Würzburg",
        category: "Gastro",
        coordinates: {
          lat: 49.7958,
          lng: 9.9264  
        },           
        duration: "90min",
        description: "Genuss & Tradition"
      },
      {
        name: "Residenz Würzburg",
        category: "Kultur",
        coordinates: {
          lat: 49.7928,
          lng: 9.9385  
        },           
        duration: "60min",
        description: "Weltkulturerbe"
      }
    ]
  },
{
    title: "Runde über die Bismarckhöhe Schweinfurt",
    duration: "3h",
    difficulty: "mittel",
    stops: [
      {
        name: "Dianenslust Schweinfurt",
        category: "Kultur",     
        coordinates: {
          lat: 50.0676,
          lng: 10.2755   
        },
        duration: "30min",
        description: "Rast und Erholung"
      },
      {
        name: "Schloss Mainberg Aussichtspunkt",
        category: "Erholung",
        coordinates: {
          lat: 50.0588,
          lng: 10.2864   
        },
        duration: "60min",
        description: "Aussicht aufs Schloss"
      },
      {
        name: "Bismarckhöhe Schweinfurt",
        category: "Kultur",
        coordinates: {
          lat: 50.0577,
          lng: 10.2692   
        },
        duration: "120min",
        description: "Aussicht aufs Maintal"
      },
      {
        name: "Almrösl Schweinfurt",
        category: "Gastro",
        coordinates: {
          lat: 50.0647,
          lng: 10.2642   
        },
        duration: "90min",
        description: "Stärkung nach der Wanderung"
      }
    ]
  },
  {
    title: "Maininselrunde Volkach",
    duration: "8h",
    difficulty: "schwer",
    stops: [
      {
        name: "Altstadt Volkach",
        category: "Kultur",
        coordinates: {
          lat: 49.8656,
          lng: 10.2262  
        },
        duration: "30min",
        description: "Historische Altstadt"
      },
      {
        name: "Vogelsburg Aussichtspunkt Astheim",
        category: "Erholung",
        coordinates: {
          lat: 50.0588,
          lng: 10.2864  
        },
        duration: "60min",
        description: "Aussicht auf die Burg"
      },
      {
        name: "Vogelsburg Volkach",
        category: "Gastro",
        coordinates: {
          lat: 50.0577,
          lng: 10.2692  
        },
        duration: "180min",
        description: "Aussicht und Genuss"
      },
      {
        name: "Fähre Nordheim am Main",
        category: "Kultur",
        coordinates: {
          lat: 50.0647,
          lng: 10.2642  
        },
        duration: "120min",
        description: "Fährfahrt in einem fränkischen Weindorf"
      }
    ]
  }
];