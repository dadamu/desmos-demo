import * as React from 'react';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { useQuery } from 'react-query'
import { useClientContext } from "../context/client";

export interface Props {
  user: string,
  content: string
};

export const Post: React.FC<Props> = ({ user, content }) => {
  const { client } = useClientContext();

  const { data, isLoading, isError, isSuccess } = useQuery(
    `posts-${user}`,
    async () => {
      return await client!.querier.profilesV3.profile(user);
    },
    {
      enabled: !!client
    }
  )

  return <ListItem sx={{ border: 2, borderRadius: 2, m: 1 }} alignItems={"flex-start"}>
    <ListItemText
      secondaryTypographyProps={{ fontSize: '1.5em' }}
      style={{ whiteSpace: 'pre-line' }}
      secondary={
        <>
          {isLoading && user}
          {isError && user}
          {isSuccess && data === undefined && user}
          {isSuccess && data !== undefined && data!.dtag} : <br />
          {content}
        </>
      }
    />
  </ListItem>
}