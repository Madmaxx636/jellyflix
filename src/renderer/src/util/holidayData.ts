// A short list of well-loved holiday titles, to look for in the library by name. It is only a list of names: nothing is
// fetched from anywhere, and anything not in the library is simply not found. (The library's own ratings pick up the rest.)

export interface Classic { title: string; year?: number }
/** An episode of a series, such as a holiday episode of a long-running show. */
export interface ClassicEpisode { series: string; title: string }

export interface HolidayData { movies: Classic[]; episodes: ClassicEpisode[] }

const christmas: HolidayData = {
  movies: [
    { title: "It's a Wonderful Life", year: 1946 }, { title: 'Miracle on 34th Street', year: 1947 }, { title: 'Miracle on 34th Street', year: 1994 },
    { title: 'White Christmas', year: 1954 }, { title: 'Holiday Inn', year: 1942 }, { title: "The Bishop's Wife", year: 1947 },
    { title: 'The Shop Around the Corner', year: 1940 }, { title: 'Christmas in Connecticut', year: 1945 }, { title: 'Meet Me in St. Louis', year: 1944 },
    { title: 'Scrooge', year: 1951 }, { title: 'Scrooge', year: 1970 }, { title: 'A Christmas Carol', year: 1984 }, { title: 'A Christmas Carol', year: 1951 },
    { title: 'The Muppet Christmas Carol', year: 1992 }, { title: "Mickey's Christmas Carol", year: 1983 }, { title: 'Scrooged', year: 1988 },
    { title: 'A Charlie Brown Christmas', year: 1965 }, { title: 'How the Grinch Stole Christmas!', year: 1966 }, { title: 'Dr. Seuss How the Grinch Stole Christmas', year: 2000 },
    { title: 'The Grinch', year: 2018 }, { title: 'Rudolph the Red-Nosed Reindeer', year: 1964 }, { title: 'Frosty the Snowman', year: 1969 },
    { title: 'Santa Claus Is Comin to Town', year: 1970 }, { title: 'The Year Without a Santa Claus', year: 1974 }, { title: 'The Snowman', year: 1982 },
    { title: 'A Christmas Story', year: 1983 }, { title: 'National Lampoons Christmas Vacation', year: 1989 }, { title: 'Home Alone', year: 1990 },
    { title: 'Home Alone 2 Lost in New York', year: 1992 }, { title: 'The Santa Clause', year: 1994 }, { title: 'The Nightmare Before Christmas', year: 1993 },
    { title: 'Elf', year: 2003 }, { title: 'The Polar Express', year: 2004 }, { title: 'Love Actually', year: 2003 }, { title: 'The Holiday', year: 2006 },
    { title: 'Arthur Christmas', year: 2011 }, { title: 'Klaus', year: 2019 }, { title: 'Prancer', year: 1989 }, { title: 'Jingle All the Way', year: 1996 },
    { title: 'Die Hard', year: 1988 }, { title: 'Gremlins', year: 1984 }, { title: 'Trading Places', year: 1983 }, { title: 'The Man Who Invented Christmas', year: 2017 },
    { title: 'Fred Claus', year: 2007 }, { title: 'The Christmas Chronicles', year: 2018 }, { title: 'Noelle', year: 2019 }
  ],
  episodes: [
    { series: 'The Twilight Zone', title: 'The Night of the Meek' }, { series: 'The Twilight Zone', title: 'Night of the Meek' },
    { series: 'The Simpsons', title: 'Simpsons Roasting on an Open Fire' }, { series: 'The Simpsons', title: 'Miracle on Evergreen Terrace' },
    { series: 'Seinfeld', title: 'The Strike' }, { series: 'I Love Lucy', title: 'Christmas Episode' }, { series: 'Frasier', title: "Merry Christmas, Mrs. Moskowitz" },
    { series: 'Friends', title: 'The One with the Holiday Armadillo' }, { series: 'The Office', title: 'Christmas Party' }, { series: 'The Office', title: 'Secret Santa' },
    { series: 'Cheers', title: 'Christmas Cheers' }, { series: 'The Andy Griffith Show', title: 'Christmas Story' }, { series: 'The Brady Bunch', title: 'The Voice of Christmas' },
    { series: 'The Dick Van Dyke Show', title: 'The Alan Brady Show Goes to Jail' }, { series: 'Doctor Who', title: 'The Christmas Invasion' },
    { series: 'Doctor Who', title: 'A Christmas Carol' }, { series: 'Parks and Recreation', title: 'Citizen Knope' }, { series: 'Community', title: 'Abed\'s Uncontrollable Christmas' },
    { series: 'Black Adder', title: "Blackadder's Christmas Carol" }, { series: 'The Muppet Show', title: 'John Denver' }
  ]
}

const thanksgiving: HolidayData = {
  movies: [
    { title: 'Planes, Trains and Automobiles', year: 1987 }, { title: 'A Charlie Brown Thanksgiving', year: 1973 }, { title: 'Home for the Holidays', year: 1995 },
    { title: 'Hannah and Her Sisters', year: 1986 }, { title: 'Free Birds', year: 2013 }, { title: 'Addams Family Values', year: 1993 },
    { title: "Alice's Restaurant", year: 1969 }, { title: 'Pieces of April', year: 2003 }, { title: 'Scent of a Woman', year: 1992 }, { title: 'Dutch', year: 1991 },
    { title: "Garfield's Thanksgiving", year: 1989 }, { title: 'The Mayflower Voyagers', year: 1988 }, { title: 'Miracle on 34th Street', year: 1947 },
    { title: 'Funny Farm', year: 1988 }, { title: 'Son-in-Law', year: 1993 }, { title: 'Grumpy Old Men', year: 1993 }, { title: 'Uncle Buck', year: 1989 },
    { title: 'Krush Groove', year: 1985 }, { title: 'Mrs. Doubtfire', year: 1993 }, { title: 'Rocky', year: 1976 }
  ],
  episodes: [
    { series: 'Friends', title: 'The One with All the Thanksgivings' }, { series: 'Friends', title: 'The One with the Thanksgiving Flashbacks' },
    { series: 'Friends', title: 'The One with the Football' }, { series: 'WKRP in Cincinnati', title: 'Turkeys Away' }, { series: 'Cheers', title: 'Thanksgiving Orphans' },
    { series: 'The Simpsons', title: 'Bart vs. Thanksgiving' }, { series: 'Seinfeld', title: 'The Mom & Pop Store' }, { series: 'Gilmore Girls', title: 'A Deep-Fried Korean Thanksgiving' },
    { series: 'Roseanne', title: 'Thanksgiving 91' }, { series: 'The Golden Girls', title: 'Sick and Tired' }, { series: 'The Office', title: 'Thanksgiving' },
    { series: 'Parks and Recreation', title: 'Pawnee Rangers' }, { series: 'The Cosby Show', title: 'Happy Thanksgiving' }, { series: 'Full House', title: 'Thanksgiving' }
  ]
}

const halloween: HolidayData = {
  movies: [
    { title: 'Hocus Pocus', year: 1993 }, { title: 'Beetlejuice', year: 1988 }, { title: 'Halloweentown', year: 1998 }, { title: 'Casper', year: 1995 },
    { title: 'The Addams Family', year: 1991 }, { title: 'Addams Family Values', year: 1993 }, { title: 'Ghostbusters', year: 1984 }, { title: 'The Nightmare Before Christmas', year: 1993 },
    { title: "It's the Great Pumpkin, Charlie Brown", year: 1966 }, { title: 'Young Frankenstein', year: 1974 }, { title: 'Monster House', year: 2006 }, { title: 'Coraline', year: 2009 },
    { title: 'Corpse Bride', year: 2005 }, { title: 'Frankenweenie', year: 2012 }, { title: 'ParaNorman', year: 2012 }, { title: 'Hotel Transylvania', year: 2012 },
    { title: 'Monsters, Inc.', year: 2001 }, { title: 'The Haunted Mansion', year: 2003 }, { title: 'Abbott and Costello Meet Frankenstein', year: 1948 },
    { title: 'Psycho', year: 1960 }, { title: 'Halloween', year: 1978 }, { title: 'Frankenstein', year: 1931 }, { title: 'Dracula', year: 1931 }, { title: 'Nosferatu', year: 1922 },
    { title: 'The Shining', year: 1980 }, { title: 'The Birds', year: 1963 }, { title: 'Alien', year: 1979 }, { title: 'The Thing', year: 1982 },
    { title: 'An American Werewolf in London', year: 1981 }, { title: 'Poltergeist', year: 1982 }, { title: 'Scream', year: 1996 }, { title: 'Night of the Living Dead', year: 1968 },
    { title: 'Rosemarys Baby', year: 1968 }, { title: 'The Sixth Sense', year: 1999 }, { title: 'Arsenic and Old Lace', year: 1944 }, { title: "Pee-wee's Big Adventure", year: 1985 }
  ],
  episodes: [
    { series: 'The Simpsons', title: 'Treehouse of Horror' }, { series: 'The Twilight Zone', title: 'Nightmare at 20,000 Feet' },
    { series: 'The Twilight Zone', title: 'Living Doll' }, { series: 'The Twilight Zone', title: 'Eye of the Beholder' }
  ]
}

const valentines: HolidayData = {
  movies: [
    { title: 'Casablanca', year: 1942 }, { title: 'When Harry Met Sally...', year: 1989 }, { title: 'The Princess Bride', year: 1987 }, { title: 'Sleepless in Seattle', year: 1993 },
    { title: 'Roman Holiday', year: 1953 }, { title: 'An Affair to Remember', year: 1957 }, { title: "Breakfast at Tiffany's", year: 1961 }, { title: 'The Philadelphia Story', year: 1940 },
    { title: 'Moonstruck', year: 1987 }, { title: 'Dirty Dancing', year: 1987 }, { title: 'Pretty Woman', year: 1990 }, { title: 'Ghost', year: 1990 },
    { title: 'Notting Hill', year: 1999 }, { title: 'Pride & Prejudice', year: 2005 }, { title: 'The Notebook', year: 2004 }, { title: 'La La Land', year: 2016 },
    { title: "Singin' in the Rain", year: 1952 }, { title: 'Beauty and the Beast', year: 1991 }, { title: 'Lady and the Tramp', year: 1955 }, { title: 'WALL-E', year: 2008 },
    { title: 'Say Anything...', year: 1989 }, { title: 'Before Sunrise', year: 1995 }, { title: 'Amélie', year: 2001 }, { title: 'It Happened One Night', year: 1934 },
    { title: 'The Apartment', year: 1960 }, { title: 'Love Story', year: 1970 }, { title: 'You\'ve Got Mail', year: 1998 }, { title: 'Roxanne', year: 1987 }
  ],
  episodes: [
    { series: 'Friends', title: 'The One with the Prom Video' }, { series: 'The Office', title: "Valentine's Day" }, { series: 'Cheers', title: "Love Is a Really Special Day" },
    { series: 'I Love Lucy', title: "Lucy's Valentine" }
  ]
}

export const HOLIDAY_DATA: Record<string, HolidayData> = { christmas, thanksgiving, halloween, valentines }

/** A name reduced to what matters for telling whether two titles are the same: no case, accents, articles or punctuation. */
export function plainName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/^(the|a|an) /, '').replace(/[^a-z0-9]+/g, ' ').trim()
}
